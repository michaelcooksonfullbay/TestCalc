output "cloudfront_url" {
  description = "CloudFront distribution URL"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (for cache invalidation)"
  value       = aws_cloudfront_distribution.main.id
}

output "s3_bucket_name" {
  description = "S3 bucket name for static files"
  value       = aws_s3_bucket.static.id
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.runner.repository_url
}

output "lambda_function_url" {
  description = "Lambda function URL"
  value       = aws_lambda_function_url.runner.function_url
}

output "history_lambda_function_url" {
  description = "History Lambda function URL"
  value       = aws_lambda_function_url.history.function_url
}

output "dynamodb_table_name" {
  description = "DynamoDB history table name"
  value       = aws_dynamodb_table.history.name
}
