output "region" {
  description = "AWS region containing the project resources."
  value       = var.region
}

output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API endpoint."
  value       = module.eks.cluster_endpoint
}

output "ecr_repository_url" {
  description = "Fully qualified ECR repository URL for Docker images."
  value       = aws_ecr_repository.application.repository_url
}

output "ecr_registry" {
  description = "ECR registry host for Docker authentication."
  value       = split("/", aws_ecr_repository.application.repository_url)[0]
}
