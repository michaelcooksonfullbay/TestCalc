FROM mcr.microsoft.com/playwright:v1.50.0-noble

# Copy AWS Lambda Web Adapter extension
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.8.4 /lambda-adapter /opt/extensions/lambda-adapter

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci && npx playwright install chromium

# Copy application files
COPY . .

# Lambda Web Adapter config
ENV PORT=8080
ENV AWS_LWA_PORT=8080
ENV AWS_LWA_READINESS_CHECK_PATH=/health
ENV AWS_LWA_READINESS_CHECK_MIN_UNHEALTHY_STATUS=500

# Playwright/Lambda environment
ENV HOME=/tmp
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

CMD ["node", "lambda/server.js"]
