pipeline {
    agent any

    tools {
        maven 'Maven-3.9'
    }

    options {
        timestamps()
        disableConcurrentBuilds()
        timeout(time: 40, unit: 'MINUTES')
    }

    environment {
        IMAGE_NAME = 'devops-tasks'
    }

    stages {
        stage('Build and test') {
            steps {
                sh 'mvn --batch-mode --no-transfer-progress clean verify'
                script {
                    env.IMAGE_TAG = env.GIT_COMMIT.take(12)
                }
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                    archiveArtifacts artifacts: 'target/*.jar,target/site/jacoco/jacoco.xml', fingerprint: true
                }
            }
        }

        stage('SonarQube analysis') {
            when {
                branch 'main'
            }
            steps {
                withSonarQubeEnv('SonarQube') {
                    withCredentials([string(credentialsId: 'sonarqube-token', variable: 'SONAR_TOKEN')]) {
                        sh 'mvn --batch-mode --no-transfer-progress sonar:sonar -Dsonar.token="$SONAR_TOKEN"'
                    }
                }
            }
        }

        stage('Quality gate') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 10, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        stage('Publish artifact to Nexus') {
            when {
                branch 'main'
            }
            steps {
                withCredentials([file(credentialsId: 'maven-settings', variable: 'MAVEN_SETTINGS')]) {
                    sh 'mvn --batch-mode --no-transfer-progress deploy -DskipTests -s "$MAVEN_SETTINGS"'
                }
            }
        }

        stage('Build and publish image to ECR') {
            when {
                branch 'main'
            }
            steps {
                script {
                    withAWS(credentials: 'aws-credentials', region: env.AWS_REGION) {
                        sh '''
                            aws ecr get-login-password --region "$AWS_REGION" \
                              | docker login --username AWS --password-stdin "$ECR_REGISTRY"
                            docker build --pull \
                              --tag "$ECR_REGISTRY/$IMAGE_NAME:$IMAGE_TAG" .
                            docker push "$ECR_REGISTRY/$IMAGE_NAME:$IMAGE_TAG"
                        '''
                    }
                }
            }
        }

        stage('Deploy to Kubernetes') {
            when {
                branch 'main'
            }
            steps {
                script {
                    withAWS(credentials: 'aws-credentials', region: env.AWS_REGION) {
                        sh '''
                            aws eks update-kubeconfig --region "$AWS_REGION" --name "$EKS_CLUSTER_NAME"
                            kubectl get secret devops-tasks-db --namespace devops-tasks
                            kubectl apply -f k8s/namespace.yaml
                            kubectl apply -f k8s/postgres.yaml
                            kubectl rollout status statefulset/postgres --namespace devops-tasks --timeout=5m
                            kubectl apply -f k8s/app.yaml
                            kubectl set image deployment/devops-tasks \
                              app="$ECR_REGISTRY/$IMAGE_NAME:$IMAGE_TAG" --namespace devops-tasks
                            kubectl rollout status deployment/devops-tasks --namespace devops-tasks --timeout=5m
                            kubectl get service devops-tasks --namespace devops-tasks
                        '''
                    }
                }
            }
        }
    }
}
