#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
INFRA_DIR="${PROJECT_DIR}/infra"
AWS_REGION="us-west-2"
AWS_ACCOUNT_ID="345594586248"
AWS_PROFILE="fb-sandbox-non-prod/Admin"
ECR_REPO="testcalc-runner"
IMAGE_TAG="latest"

echo "==> Step 1: Terraform init"
cd "${INFRA_DIR}"
terraform init

echo "==> Step 2: Create ECR repository first"
terraform apply -target=aws_ecr_repository.runner -target=aws_ecr_lifecycle_policy.runner -auto-approve

echo "==> Step 3: Build and push Docker image"
ECR_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
ECR_IMAGE="${ECR_URL}/${ECR_REPO}:${IMAGE_TAG}"

aws ecr get-login-password --region "${AWS_REGION}" --profile "${AWS_PROFILE}" | \
  docker login --username AWS --password-stdin "${ECR_URL}"

cd "${PROJECT_DIR}"
docker build --platform linux/amd64 --provenance=false -t "${ECR_REPO}:${IMAGE_TAG}" .
docker tag "${ECR_REPO}:${IMAGE_TAG}" "${ECR_IMAGE}"
docker push "${ECR_IMAGE}"

echo "==> Step 4: Terraform apply (full infrastructure)"
cd "${INFRA_DIR}"
terraform apply -auto-approve

echo "==> Step 5: Update Lambda to use latest image"
aws lambda update-function-code \
  --function-name "${ECR_REPO}" \
  --image-uri "${ECR_IMAGE}" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --query 'FunctionName' --output text
aws lambda wait function-updated \
  --function-name "${ECR_REPO}" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}"

echo "==> Step 6: Sync static files to S3"
S3_BUCKET=$(terraform output -raw s3_bucket_name)
cd "${PROJECT_DIR}"

aws s3 sync . "s3://${S3_BUCKET}" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}" \
  --exclude ".*" \
  --exclude "node_modules/*" \
  --exclude "infra/*" \
  --exclude "lambda/*" \
  --exclude "lambda-history/*" \
  --exclude "lambda-history.zip" \
  --exclude "scripts/*" \
  --exclude "test-results/*" \
  --exclude "playwright-report/*" \
  --exclude "tests/*" \
  --exclude "Dockerfile" \
  --exclude "deploy.sh" \
  --exclude "package.json" \
  --exclude "package-lock.json" \
  --exclude "tsconfig.json" \
  --exclude "playwright.config.ts" \
  --exclude "test-server.js" \
  --exclude "*.md" \
  --delete

echo "==> Step 7: Invalidate CloudFront cache"
cd "${INFRA_DIR}"
CF_DIST_ID=$(terraform output -raw cloudfront_distribution_id)
aws cloudfront create-invalidation \
  --distribution-id "${CF_DIST_ID}" \
  --paths "/*" \
  --profile "${AWS_PROFILE}" \
  --region "${AWS_REGION}"

echo "==> Step 8: Seed history data"
cd "${PROJECT_DIR}"
AWS_PROFILE="${AWS_PROFILE}" AWS_REGION="${AWS_REGION}" node scripts/seed-history.js

echo ""
echo "==> Deployment complete!"
cd "${INFRA_DIR}"
CLOUDFRONT_URL=$(terraform output -raw cloudfront_url)
echo "    URL: ${CLOUDFRONT_URL}"
echo "    v1:  ${CLOUDFRONT_URL}/"
echo "    v2:  ${CLOUDFRONT_URL}/v2/"
echo "    v1 tests: ${CLOUDFRONT_URL}/test-report.html"
echo "    v2 tests: ${CLOUDFRONT_URL}/v2/test-report.html"
echo "    History: ${CLOUDFRONT_URL}/history.html"
