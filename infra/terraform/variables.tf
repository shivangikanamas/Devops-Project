variable "region" {
  description = "AWS region for the VPC, EKS cluster, and ECR repository."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Unique lowercase project name used to tag and name AWS resources."
  type        = string
  default     = "devops-tasks"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,19}$", var.project_name))
    error_message = "Use 3-20 lowercase letters, numbers, or hyphens; start with a letter."
  }
}

variable "cluster_name" {
  description = "Name of the Amazon EKS cluster."
  type        = string
  default     = "devops-tasks"
}

variable "kubernetes_version" {
  description = "Kubernetes minor version supported by Amazon EKS in the chosen region."
  type        = string
  default     = "1.34"
}

variable "cluster_endpoint_public_access_cidrs" {
  description = "Trusted public IPv4 CIDRs allowed to reach the Kubernetes API, including the Jenkins agent's egress IP."
  type        = list(string)

  validation {
    condition     = length(var.cluster_endpoint_public_access_cidrs) > 0 && !contains(var.cluster_endpoint_public_access_cidrs, "0.0.0.0/0")
    error_message = "Restrict Kubernetes API access to one or more trusted IP ranges; 0.0.0.0/0 is not allowed."
  }
}
