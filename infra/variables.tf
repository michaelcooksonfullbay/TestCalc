variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "testcalc"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "aws_account_id" {
  description = "AWS account ID"
  type        = string
  default     = "345594586248"
}
