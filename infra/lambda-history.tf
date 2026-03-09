# IAM Role for History Lambda
resource "aws_iam_role" "lambda_history" {
  name = "${var.project_name}-lambda-history-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "sts:AssumeRole"
        Effect    = "Allow"
        Principal = { Service = "lambda.amazonaws.com" }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_history_basic" {
  role       = aws_iam_role.lambda_history.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# DynamoDB access policy
resource "aws_iam_role_policy" "lambda_history_dynamodb" {
  name = "${var.project_name}-lambda-history-dynamodb"
  role = aws_iam_role.lambda_history.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:Scan",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:BatchWriteItem",
        ]
        Resource = aws_dynamodb_table.history.arn
      }
    ]
  })
}

# Zip the lambda code
data "archive_file" "lambda_history" {
  type        = "zip"
  source_dir  = "${path.module}/../lambda-history"
  output_path = "${path.module}/../lambda-history.zip"
}

# Lambda Function
resource "aws_lambda_function" "history" {
  function_name    = "${var.project_name}-history"
  role             = aws_iam_role.lambda_history.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  filename         = data.archive_file.lambda_history.output_path
  source_code_hash = data.archive_file.lambda_history.output_base64sha256
  timeout          = 10
  memory_size      = 128

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.history.name
    }
  }
}

# Function URL (public access)
resource "aws_lambda_function_url" "history" {
  function_name      = aws_lambda_function.history.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["*"]
    allow_headers = ["content-type"]
  }
}
