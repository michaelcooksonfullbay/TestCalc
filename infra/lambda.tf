# IAM Role
resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-role"

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

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Lambda Function
resource "aws_lambda_function" "runner" {
  function_name = "${var.project_name}-runner"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = "${aws_ecr_repository.runner.repository_url}:latest"
  timeout       = 300
  memory_size   = 3008

  environment {
    variables = {
      HOME                     = "/tmp"
      PLAYWRIGHT_BROWSERS_PATH = "/ms-playwright"
    }
  }
}

# Function URL (public access)
resource "aws_lambda_function_url" "runner" {
  function_name      = aws_lambda_function.runner.function_name
  authorization_type = "NONE"

  cors {
    allow_origins = ["*"]
    allow_methods = ["POST"]
    allow_headers = ["content-type"]
  }
}
