# Daymark — Java DevOps Task Manager

A portfolio-ready task manager with a Java 25 REST API, a responsive HTML/CSS/JavaScript interface, and a production-style delivery path for AWS.

**[Open the interactive browser demo](https://shivangikanamas.github.io/Devops-Project/)** · [View the source on GitHub](https://github.com/shivangikanamas/Devops-Project)

A separate personal portfolio site is in [`portfolio/`](portfolio/). When these files are pushed to the repository's GitHub Pages source, it will be available at `https://shivangikanamas.github.io/Devops-Project/portfolio/` and can be added to LinkedIn's Featured section.

The public demo runs in your browser and saves sample tasks in that browser only. Run the Java application to use the real REST API and its database.

## What the application does

- Create, edit, find, filter, complete, and delete tasks.
- Organize work by to-do, in-progress, or completed status and low, medium, or high priority.
- Store tasks in a local H2 database when running on your computer.
- Use PostgreSQL when deployed to Kubernetes.
- Expose validated REST endpoints and a health check at `/actuator/health`.
- Serve the browser app and REST API from the same Java application.

## Technology stack

| Technology | How this project uses it |
| --- | --- |
| Java 25, Spring Boot, Spring Data JPA | REST API, validation, persistence, and health checks |
| HTML, CSS, JavaScript | Responsive task-board UI; its public GitHub Pages preview uses browser-local demo data |
| Maven | Reproducible build, tests, code coverage, and publishing the Java artifact |
| Docker | Multi-stage, non-root image for running the app |
| Jenkins | Test, SonarQube analysis, Nexus publishing, ECR image publishing, and Kubernetes deployment |
| SonarQube | Static code analysis and coverage reporting |
| Nexus Repository | Private Maven artifact repository |
| Terraform | AWS VPC, Amazon EKS, ECR, and managed worker nodes |
| Ansible | Configure a Linux Jenkins build agent with Java, Maven, Docker, AWS CLI, and kubectl |
| AWS | EKS Kubernetes cluster, ECR container registry, EC2 worker nodes, load balancer, and networking |
| Kubernetes | Run the application and PostgreSQL with probes, resource limits, and persistent storage |

## Run it on your computer

You need JDK 25 and Maven 3.9 or newer.

```powershell
mvn spring-boot:run
```

Open **http://localhost:8080**. The browser app will save tasks through the Java API to a local H2 database. Task data is stored under `data/`, which is excluded from Git.

Run the automated tests and create the executable JAR:

```powershell
mvn verify
java -jar target/devops-eng-proj-1.0.0-SNAPSHOT.jar
```

Try the API from another PowerShell window:

```powershell
$task = Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/tasks `
  -ContentType 'application/json' `
  -Body '{"title":"Review the deployment","description":"Check the health endpoint","priority":"HIGH","status":"TODO"}'

$task
Invoke-RestMethod -Uri http://localhost:8080/api/tasks
Invoke-RestMethod -Uri http://localhost:8080/actuator/health
```

The Java service provides `GET`, `POST`, `PUT`, and `DELETE` routes under `/api/tasks`.

## Run it with Docker

```powershell
docker build -t devops-tasks:local .
docker run --rm -p 8080:8080 -v devops-tasks-data:/app/data devops-tasks:local
```

Open **http://localhost:8080**. The Docker volume keeps the local database when the container is replaced.

## AWS deployment and cost warning

Terraform provisions a real EKS cluster, VPC, NAT gateway, managed EC2 worker nodes, and ECR repository. **This creates billable AWS resources**; charges continue for as long as those resources exist. EKS, worker nodes, networking/NAT, storage, and the Kubernetes load balancer can together cost **well over US$100 per month**, depending on region and usage.

Do not run `terraform apply` unless you have an AWS account, an approved budget, and the required AWS permissions. Restrict the Kubernetes API endpoint to your own public IP. When finished, run `terraform destroy` and confirm the load balancer and other resources have been removed.

The sample Kubernetes service creates a public HTTP load balancer and the demo has no login or authorization. Do not enter real or sensitive tasks. Add HTTPS and authentication before using it with real users or data.

### 1. Provision AWS infrastructure

Install the AWS CLI and Terraform, configure an AWS profile, and choose your own API access CIDR. From PowerShell:

```powershell
aws configure
Set-Location infra/terraform
terraform init
terraform plan -out=devops-tasks.tfplan `
  -var="cluster_endpoint_public_access_cidrs=[`"YOUR_PUBLIC_IP/32`",`"JENKINS_EGRESS_IP/32`"]"
terraform apply devops-tasks.tfplan
```

Do not use `0.0.0.0/0` for the cluster API access range. Include both your own public IP and the Jenkins agent's outbound public IP in the allowed CIDR list. Save the Terraform outputs; use `cluster_name`, `region`, and `ecr_repository_url` when configuring Jenkins. Terraform state is local and excluded from Git; back it up securely and do not publish it.

### 2. Configure a Linux Jenkins build agent with Ansible

Jenkins itself, Nexus, and SonarQube must be reachable on hosts that you administer. This project does not create public Jenkins/Nexus/SonarQube servers or embed their credentials. On an Ansible control machine, copy `infra/ansible/inventory.example.ini` to a private `inventory.ini`, replace the example host with your Linux build agent's address, then run:

```bash
ansible-playbook -i inventory.ini infra/ansible/configure-jenkins-agent.yml
```

The example inventory is deliberately ignored by Git; never put private SSH keys, passwords, or tokens in an inventory committed to this repository.

### 3. Configure Jenkins, SonarQube, and Nexus

Create a Jenkins multibranch or pipeline job for this repository and install/configure:

- Pipeline, Credentials Binding, AWS Steps (`withAWS`), SonarQube Scanner, and Config File Provider plugins.
- A Java 25 Linux agent with Docker available and the required packages configured by Ansible.
- A Jenkins Maven tool named `Maven-3.9`, set to Maven 3.9 or newer, matching the name declared in the `Jenkinsfile`.
- An AWS IAM role or Jenkins credential with the ECR push and EKS deployment permissions it needs.
- A SonarQube server called `SonarQube` and its Jenkins credential `sonarqube-token`.
- A Jenkins **secret file** credential `maven-settings`, containing Maven server credentials for the `nexus` server ID, and an accessible Nexus Maven `maven-snapshots` repository.
- Pipeline environment values `AWS_REGION`, `EKS_CLUSTER_NAME`, and `ECR_REGISTRY` (the account and region host part of the Terraform ECR repository URL, without `/devops-tasks`).

Example Maven settings structure (replace the placeholders in Jenkins' secret file; do not save actual credentials here):

```xml
<settings>
  <servers>
    <server>
      <id>nexus</id>
      <username>NEXUS_USERNAME</username>
      <password>NEXUS_PASSWORD</password>
    </server>
  </servers>
</settings>
```

Set `NEXUS_URL` in the Jenkins job to the Nexus base URL, for example `https://nexus.example.com` (no trailing slash). Configure a SonarQube webhook to `<JENKINS_URL>/sonarqube-webhook/` so the quality-gate stage can finish. Review the sample `Jenkinsfile` and adapt credentials, allowed repositories, and IAM policy to your own environment before enabling deployments.

Publishing, ECR, SonarQube, and deployment stages run only for the `main` branch; other branches run the automated build and tests without deploying.

### 4. Deploy to Kubernetes

Once Terraform has finished, create a kubeconfig entry using the Terraform outputs:

```bash
aws eks update-kubeconfig --region YOUR_AWS_REGION --name YOUR_EKS_CLUSTER_NAME
```

Before the first deployment, create a Kubernetes secret for PostgreSQL without committing it:

```bash
kubectl apply -f k8s/namespace.yaml
kubectl create secret generic devops-tasks-db \
  --namespace devops-tasks \
  --from-literal=username=tasks \
  --from-literal=password='CHOOSE_A_LONG_RANDOM_PASSWORD'
```

The Jenkins pipeline then tests the project, runs the SonarQube quality gate, publishes the Maven snapshot to Nexus, builds and pushes a commit-tagged Docker image to ECR, and deploys the app and PostgreSQL to EKS. It prints the Kubernetes service details after rollout; open the external address when it is assigned.

To remove the AWS deployment after your demonstration, set the same Terraform variables and run:

```bash
cd infra/terraform
terraform destroy -var='cluster_endpoint_public_access_cidrs=["YOUR_PUBLIC_IP/32"]'
```

Review the destroy plan carefully and verify the EKS cluster, node group, NAT gateway, EBS volume, and Kubernetes load balancer have been removed in the AWS console.

## Repository layout

```text
.
├── assets/                 # Browser app CSS and JavaScript
├── infra/ansible/          # Jenkins Linux build-agent configuration
├── infra/terraform/        # AWS VPC, EKS, and ECR
├── k8s/                    # Kubernetes app and PostgreSQL manifests
├── src/main/java/          # Java REST API
├── src/main/resources/     # Spring Boot configuration
├── src/test/java/          # API and browser-serving integration tests
├── Dockerfile
├── Jenkinsfile
├── index.html              # App UI and GitHub Pages demo
└── pom.xml
```
