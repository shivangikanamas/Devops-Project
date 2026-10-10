# Deploying to Kubernetes

The EKS app manifest exposes the task manager with a cloud load balancer. The PostgreSQL StatefulSet uses a persistent volume claim; the app and database access the password through a Kubernetes secret instead of a checked-in credential.

Create the namespace and database secret before the first deploy:

```bash
kubectl apply -f namespace.yaml
kubectl create secret generic devops-tasks-db \
  --namespace devops-tasks \
  --from-literal=username=tasks \
  --from-literal=password='CHOOSE_A_LONG_RANDOM_PASSWORD'
```

The Jenkins deployment pipeline applies the PostgreSQL and app manifests and sets the app image to the current immutable ECR commit tag. The cluster must be able to pull from ECR, and the Jenkins agent must have `kubectl` and AWS EKS access configured.

For local app/API development, run `mvn spring-boot:run` and use the embedded H2 database; local Docker builds also use H2 with an explicit data volume. Kubernetes overrides the datasource to use PostgreSQL.
