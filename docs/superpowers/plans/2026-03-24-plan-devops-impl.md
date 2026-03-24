# Clawbrowser DevOps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `clawbrowser-infra` repository containing all Terraform IaC, Kubernetes manifests (Kustomize), GitHub Actions CI/CD pipelines, sealed secrets tooling, and pre-commit security hooks for deploying clawbrowser across dev/qa/prod environments on a single AWS EKS cluster.

**Architecture:** Single EKS cluster with namespace isolation (dev/qa/prod). Kustomize base + overlays for K8s manifests. Terraform provisions AWS resources (VPC, EKS, RDS, ElastiCache, IAM). GitHub Actions pipelines handle image deployment and Terraform apply. Sealed Secrets for in-cluster secret management.

**Tech Stack:** Terraform, AWS (EKS, RDS, ElastiCache, VPC, IAM, S3, DynamoDB), Kustomize, Traefik (IngressRoute CRDs), Bitnami Sealed Secrets, GitHub Actions, detect-secrets, VictoriaMetrics, VictoriaLogs, Fluent Bit, Grafana

**Spec:** `docs/superpowers/specs/2026-03-22-clawbrowser-devops-design.md`

---

## File Structure

```
clawbrowser-infra/
├── terraform/
│   ├── main.tf                          # Provider config, S3+DynamoDB backend
│   ├── vpc.tf                           # VPC, subnets, security groups
│   ├── eks.tf                           # EKS cluster, managed node group
│   ├── rds.tf                           # Single RDS, 3 databases, 9 schemas, 9 users
│   ├── elasticache.tf                   # Single Redis instance
│   ├── iam.tf                           # IAM roles, GitHub Actions OIDC
│   ├── dns.tf                           # Route53 hosted zone + DNS records
│   ├── variables.tf                     # All input variables
│   ├── outputs.tf                       # Cluster endpoint, DB endpoints, etc.
│   └── terraform.tfvars.example         # Template with placeholder values
├── k8s/
│   ├── base/
│   │   ├── clawbrowser-api/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   ├── configmap.yaml
│   │   │   └── kustomization.yaml
│   │   ├── clawbrowser-dashboard/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   ├── unkey/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── kustomization.yaml
│   │   └── unibee/
│   │       ├── deployment.yaml
│   │       ├── service.yaml
│   │       └── kustomization.yaml
│   ├── overlays/
│   │   ├── dev/
│   │   │   ├── namespace.yaml
│   │   │   ├── network-policy.yaml
│   │   │   ├── kustomization.yaml
│   │   │   ├── clawbrowser-api/
│   │   │   │   ├── patches/
│   │   │   │   │   ├── resources.yaml
│   │   │   │   │   └── env.yaml
│   │   │   │   └── sealed-secrets/
│   │   │   │       └── secrets.yaml
│   │   │   ├── clawbrowser-dashboard/
│   │   │   │   ├── patches/
│   │   │   │   │   ├── resources.yaml
│   │   │   │   │   └── env.yaml
│   │   │   │   └── sealed-secrets/
│   │   │   │       └── secrets.yaml
│   │   │   ├── unkey/
│   │   │   │   ├── patches/
│   │   │   │   │   ├── resources.yaml
│   │   │   │   │   └── env.yaml
│   │   │   │   └── sealed-secrets/
│   │   │   │       └── secrets.yaml
│   │   │   ├── unibee/
│   │   │   │   ├── patches/
│   │   │   │   │   ├── resources.yaml
│   │   │   │   │   └── env.yaml
│   │   │   │   └── sealed-secrets/
│   │   │   │       └── secrets.yaml
│   │   │   └── traefik/
│   │   │       ├── ingress-routes.yaml
│   │   │       └── forward-auth.yaml
│   │   ├── qa/
│   │   │   └── ... (same structure as dev)
│   │   └── prod/
│   │       └── ... (same structure as dev)
│   └── cluster-wide/
│       ├── traefik/
│       │   ├── deployment.yaml
│       │   ├── service.yaml
│       │   ├── rbac.yaml
│       │   └── kustomization.yaml
│       ├── sealed-secrets-controller/
│       │   ├── deployment.yaml
│       │   └── kustomization.yaml
│       ├── observability/
│       │   ├── namespace.yaml
│       │   ├── victoriametrics/
│       │   │   ├── deployment.yaml
│       │   │   ├── service.yaml
│       │   │   └── kustomization.yaml
│       │   ├── victorialogs/
│       │   │   ├── deployment.yaml
│       │   │   ├── service.yaml
│       │   │   └── kustomization.yaml
│       │   ├── grafana/
│       │   │   ├── deployment.yaml
│       │   │   ├── service.yaml
│       │   │   ├── datasources.yaml
│       │   │   └── kustomization.yaml
│       │   ├── fluent-bit/
│       │   │   ├── daemonset.yaml
│       │   │   ├── configmap.yaml
│       │   │   └── kustomization.yaml
│       │   └── kustomization.yaml
│       └── kustomization.yaml
├── .github/
│   └── workflows/
│       ├── deploy-api.yaml
│       ├── deploy-dashboard.yaml
│       ├── deploy-dev.yaml
│       ├── promote-prod.yaml
│       ├── terraform-apply.yaml
│       └── secret-scan.yaml
├── scripts/
│   ├── bootstrap-state.sh
│   ├── seal-secret.sh
│   ├── check-sealed-only.sh
│   └── deploy.sh
├── .pre-commit-config.yaml
├── .secrets.baseline
├── .gitignore
└── README.md
```

**Note on testing:** This plan is infrastructure-as-code. There are no unit tests in the traditional sense. Validation is done via:
- `terraform validate` and `terraform plan` for Terraform
- `kustomize build` for K8s manifests
- `yamllint` for YAML syntax
- `shellcheck` for shell scripts
- Dry-run builds of GitHub Actions workflows
Each task includes a validation step before commit.

---

### Task 1: Repository Scaffolding

**Files:**
- Create: `.gitignore`, `README.md`

- [ ] **Step 1: Initialize the repository**

Create `.gitignore`:

```gitignore
# Terraform
terraform/.terraform/
terraform/*.tfstate
terraform/*.tfstate.backup
terraform/terraform.tfvars
terraform/.terraform.lock.hcl

# Sealed Secrets private key (never commit)
*.pem
*.key

# Environment files
.env
.env.*

# OS files
.DS_Store
```

- [ ] **Step 2: Create README**

Create `README.md`:

```markdown
# clawbrowser-infra

Infrastructure, Kubernetes manifests, and CI/CD pipelines for clawbrowser.ai.

## Structure

- `terraform/` — AWS IaC (VPC, EKS, RDS, ElastiCache, IAM)
- `k8s/base/` — Kustomize base manifests
- `k8s/overlays/` — Per-environment overlays (dev, qa, prod)
- `k8s/cluster-wide/` — Cluster-scoped services (Traefik, Sealed Secrets, observability)
- `.github/workflows/` — CI/CD pipelines
- `scripts/` — Helper scripts (seal secrets, deploy, checks)

## Environments

| Env | API | Dashboard |
|-----|-----|-----------|
| dev | api-dev.clawbrowser.ai | dev.clawbrowser.ai |
| qa | api-qa.clawbrowser.ai | qa.clawbrowser.ai |
| prod | api.clawbrowser.ai | clawbrowser.ai |

## Prerequisites

- Terraform >= 1.5
- kubectl
- kustomize
- kubeseal
- pre-commit
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore README.md
git commit -m "chore: initialize clawbrowser-infra repository"
```

---

### Task 2: Terraform State Bootstrap Script

**Files:**
- Create: `scripts/bootstrap-state.sh`

- [ ] **Step 1: Create bootstrap script for S3 bucket and DynamoDB table**

Create `scripts/bootstrap-state.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Bootstrap Terraform state backend (S3 + DynamoDB).
# Run this once before the first `terraform init`.
# Requires AWS CLI configured with appropriate permissions.

BUCKET="clawbrowser-terraform-state"
TABLE="clawbrowser-terraform-locks"
REGION="${AWS_REGION:-us-east-1}"

echo "Creating S3 bucket for Terraform state..."
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "Bucket $BUCKET already exists, skipping."
else
  aws s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$REGION"

  aws s3api put-bucket-versioning \
    --bucket "$BUCKET" \
    --versioning-configuration Status=Enabled

  aws s3api put-bucket-encryption \
    --bucket "$BUCKET" \
    --server-side-encryption-configuration '{
      "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
    }'

  aws s3api put-public-access-block \
    --bucket "$BUCKET" \
    --public-access-block-configuration \
      BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

  echo "Bucket $BUCKET created."
fi

echo "Creating DynamoDB table for state locking..."
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" 2>/dev/null; then
  echo "Table $TABLE already exists, skipping."
else
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION"

  echo "Table $TABLE created."
fi

echo "Bootstrap complete. You can now run: cd terraform && terraform init"
```

- [ ] **Step 2: Make executable and validate**

```bash
chmod +x scripts/bootstrap-state.sh
shellcheck scripts/bootstrap-state.sh
```

Expected: No shellcheck errors.

- [ ] **Step 3: Commit**

```bash
git add scripts/bootstrap-state.sh
git commit -m "feat: add bootstrap script for Terraform S3 state backend and DynamoDB lock table"
```

---

### Task 3: Terraform — Provider, Backend, Variables

**Files:**
- Create: `terraform/main.tf`
- Create: `terraform/variables.tf`
- Create: `terraform/outputs.tf`
- Create: `terraform/terraform.tfvars.example`

- [ ] **Step 1: Create main.tf with provider and backend config**

Create `terraform/main.tf`:

```hcl
terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.22"
    }
  }

  backend "s3" {
    bucket         = "clawbrowser-terraform-state"
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "clawbrowser-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "clawbrowser"
      ManagedBy   = "terraform"
      Environment = "shared"
    }
  }
}

provider "postgresql" {
  host     = aws_db_instance.main.address
  port     = aws_db_instance.main.port
  username = var.rds_master_username
  password = var.rds_master_password
  sslmode  = "require"

  superuser = false
}
```

- [ ] **Step 2: Create variables.tf**

Create `terraform/variables.tf`:

```hcl
variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used in resource naming"
  type        = string
  default     = "clawbrowser"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones for subnets"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "eks_node_instance_type" {
  description = "EC2 instance type for EKS managed node group"
  type        = string
  default     = "t3.medium"
}

variable "eks_node_desired_size" {
  description = "Desired number of nodes in EKS node group"
  type        = number
  default     = 3
}

variable "eks_node_min_size" {
  description = "Minimum number of nodes in EKS node group"
  type        = number
  default     = 2
}

variable "eks_node_max_size" {
  description = "Maximum number of nodes in EKS node group"
  type        = number
  default     = 5
}

variable "rds_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "rds_master_username" {
  description = "RDS master username"
  type        = string
  sensitive   = true
}

variable "rds_master_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "rds_allocated_storage" {
  description = "RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "elasticache_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "github_org" {
  description = "GitHub organization name for OIDC"
  type        = string
  default     = "clawbrowser"
}

variable "github_infra_repo" {
  description = "GitHub infra repo name for OIDC"
  type        = string
  default     = "clawbrowser-infra"
}

variable "environments" {
  description = "List of environments"
  type        = list(string)
  default     = ["dev", "qa", "prod"]
}

variable "services" {
  description = "List of services per environment"
  type        = list(string)
  default     = ["clawbrowser_api", "unkey", "unibee"]
}
```

- [ ] **Step 3: Create outputs.tf**

Create `terraform/outputs.tf`:

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster API endpoint"
  value       = aws_eks_cluster.main.endpoint
}

output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.main.endpoint
}

output "elasticache_endpoint" {
  description = "ElastiCache primary endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC"
  value       = aws_iam_role.github_actions.arn
}
```

- [ ] **Step 4: Create terraform.tfvars.example**

Create `terraform/terraform.tfvars.example`:

```hcl
aws_region             = "us-east-1"
project_name           = "clawbrowser"
vpc_cidr               = "10.0.0.0/16"
availability_zones     = ["us-east-1a", "us-east-1b"]
eks_node_instance_type = "t3.medium"
eks_node_desired_size  = 3
rds_instance_class     = "db.t3.medium"
rds_master_username    = "CHANGE_ME"
rds_master_password    = "CHANGE_ME"
rds_allocated_storage  = 20
elasticache_node_type  = "cache.t3.micro"
github_org             = "clawbrowser"
github_infra_repo      = "clawbrowser-infra"
```

- [ ] **Step 5: Validate Terraform syntax**

```bash
cd terraform && terraform init -backend=false && terraform validate
```

Expected: `Success! The configuration is valid.` (init will succeed with `-backend=false` since S3 doesn't exist yet; validate checks syntax)

Note: `terraform validate` will report errors about unknown resources at this stage since vpc.tf, eks.tf, etc. don't exist yet. This is expected — just verify no syntax errors in the files created so far.

- [ ] **Step 6: Commit**

```bash
git add terraform/main.tf terraform/variables.tf terraform/outputs.tf terraform/terraform.tfvars.example
git commit -m "feat: add Terraform provider, backend, variables, and outputs"
```

---

### Task 4: Terraform — VPC

**Files:**
- Create: `terraform/vpc.tf`

- [ ] **Step 1: Create VPC with public and private subnets**

Create `terraform/vpc.tf`:

```hcl
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

resource "aws_subnet" "public" {
  count = length(var.availability_zones)

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name                                           = "${var.project_name}-public-${var.availability_zones[count.index]}"
    "kubernetes.io/role/elb"                        = "1"
    "kubernetes.io/cluster/${var.project_name}-eks" = "shared"
  }
}

resource "aws_subnet" "private" {
  count = length(var.availability_zones)

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 100)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name                                           = "${var.project_name}-private-${var.availability_zones[count.index]}"
    "kubernetes.io/role/internal-elb"               = "1"
    "kubernetes.io/cluster/${var.project_name}-eks" = "shared"
  }
}

resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip-${var.availability_zones[count.index]}"
  }
}

resource "aws_nat_gateway" "main" {
  count = length(var.availability_zones)

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-nat-${var.availability_zones[count.index]}"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table_association" "public" {
  count = length(var.availability_zones)

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "private" {
  count = length(var.availability_zones)

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.project_name}-private-rt-${var.availability_zones[count.index]}"
  }
}

resource "aws_route_table_association" "private" {
  count = length(var.availability_zones)

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

- [ ] **Step 2: Validate**

```bash
cd terraform && terraform validate
```

Expected: Valid (or only errors about missing resources from other files not yet created).

- [ ] **Step 3: Commit**

```bash
git add terraform/vpc.tf
git commit -m "feat: add Terraform VPC with public/private subnets and NAT gateways"
```

---

### Task 5: Terraform — EKS

**Files:**
- Create: `terraform/eks.tf`

- [ ] **Step 1: Create EKS cluster and managed node group**

Create `terraform/eks.tf`:

```hcl
resource "aws_iam_role" "eks_cluster" {
  name = "${var.project_name}-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_iam_role_policy_attachment" "eks_vpc_resource_controller" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.eks_cluster.name
}

resource "aws_security_group" "eks_cluster" {
  name_prefix = "${var.project_name}-eks-cluster-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-eks-cluster-sg"
  }
}

resource "aws_eks_cluster" "main" {
  name     = "${var.project_name}-eks"
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.29"

  vpc_config {
    subnet_ids         = concat(aws_subnet.public[*].id, aws_subnet.private[*].id)
    security_group_ids = [aws_security_group.eks_cluster.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
    aws_iam_role_policy_attachment.eks_vpc_resource_controller,
  ]
}

resource "aws_iam_role" "eks_nodes" {
  name = "${var.project_name}-eks-node-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_iam_role_policy_attachment" "eks_ecr_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_nodes.name
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.project_name}-nodes"
  node_role_arn   = aws_iam_role.eks_nodes.arn
  subnet_ids      = aws_subnet.private[*].id
  instance_types  = [var.eks_node_instance_type]

  scaling_config {
    desired_size = var.eks_node_desired_size
    min_size     = var.eks_node_min_size
    max_size     = var.eks_node_max_size
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_policy,
    aws_iam_role_policy_attachment.eks_cni_policy,
    aws_iam_role_policy_attachment.eks_ecr_policy,
  ]
}
```

- [ ] **Step 2: Validate**

```bash
cd terraform && terraform validate
```

- [ ] **Step 3: Commit**

```bash
git add terraform/eks.tf
git commit -m "feat: add Terraform EKS cluster with managed node group"
```

---

### Task 6: Terraform — RDS (PostgreSQL)

**Files:**
- Create: `terraform/rds.tf`

- [ ] **Step 1: Create RDS instance with 3 databases, 9 schemas, 9 users**

Create `terraform/rds.tf`:

```hcl
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

resource "aws_db_instance" "main" {
  identifier = "${var.project_name}-postgres"

  engine         = "postgres"
  engine_version = "16.2"
  instance_class = var.rds_instance_class

  allocated_storage     = var.rds_allocated_storage
  max_allocated_storage = var.rds_allocated_storage * 2
  storage_encrypted     = true

  db_name  = "clawbrowser_dev"
  username = var.rds_master_username
  password = var.rds_master_password

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  multi_az            = false
  publicly_accessible = false
  skip_final_snapshot = false
  final_snapshot_identifier = "${var.project_name}-final-snapshot"

  backup_retention_period = 7
  backup_window           = "03:00-04:00"

  tags = {
    Name = "${var.project_name}-postgres"
  }
}

# Create the additional databases (dev is created by aws_db_instance.db_name)
resource "postgresql_database" "qa" {
  name  = "clawbrowser_qa"
  owner = var.rds_master_username

  depends_on = [aws_db_instance.main]
}

resource "postgresql_database" "prod" {
  name  = "clawbrowser_prod"
  owner = var.rds_master_username

  depends_on = [aws_db_instance.main]
}

# Create schemas and users for each environment × service combination
locals {
  db_env_service_pairs = flatten([
    for env in var.environments : [
      for svc in var.services : {
        env      = env
        service  = svc
        db_name  = "clawbrowser_${env}"
        username = "${svc}_${env}"
        schema   = svc
      }
    ]
  ])
}

resource "random_password" "db_users" {
  for_each = { for pair in local.db_env_service_pairs : "${pair.username}" => pair }

  length  = 24
  special = false
}

resource "postgresql_role" "db_users" {
  for_each = { for pair in local.db_env_service_pairs : "${pair.username}" => pair }

  name     = each.value.username
  login    = true
  password = random_password.db_users[each.key].result

  depends_on = [aws_db_instance.main]
}

resource "postgresql_schema" "schemas" {
  for_each = { for pair in local.db_env_service_pairs : "${pair.db_name}_${pair.schema}" => pair }

  name     = each.value.schema
  database = each.value.db_name
  owner    = each.value.username

  depends_on = [
    postgresql_database.qa,
    postgresql_database.prod,
    postgresql_role.db_users,
  ]
}

resource "postgresql_grant" "connect" {
  for_each = { for pair in local.db_env_service_pairs : "${pair.username}" => pair }

  database    = each.value.db_name
  role        = each.value.username
  object_type = "database"
  privileges  = ["CONNECT"]

  depends_on = [postgresql_role.db_users]
}

resource "postgresql_grant" "schema_usage" {
  for_each = { for pair in local.db_env_service_pairs : "${pair.username}" => pair }

  database    = each.value.db_name
  schema      = each.value.schema
  role        = each.value.username
  object_type = "schema"
  privileges  = ["USAGE", "CREATE"]

  depends_on = [postgresql_schema.schemas]
}

resource "postgresql_grant" "table_all" {
  for_each = { for pair in local.db_env_service_pairs : "${pair.username}" => pair }

  database    = each.value.db_name
  schema      = each.value.schema
  role        = each.value.username
  object_type = "table"
  privileges  = ["ALL"]

  depends_on = [postgresql_schema.schemas]
}
```

- [ ] **Step 2: Validate**

```bash
cd terraform && terraform validate
```

- [ ] **Step 3: Commit**

```bash
git add terraform/rds.tf
git commit -m "feat: add Terraform RDS with 3 databases, 9 schemas, 9 users"
```

---

### Task 7: Terraform — ElastiCache (Redis) + IAM (OIDC)

**Files:**
- Create: `terraform/elasticache.tf`
- Create: `terraform/iam.tf`

- [ ] **Step 1: Create ElastiCache Redis instance**

Create `terraform/elasticache.tf`:

```hcl
resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_eks_cluster.main.vpc_config[0].cluster_security_group_id]
  }

  tags = {
    Name = "${var.project_name}-redis-sg"
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "${var.project_name}-redis-subnet"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_cluster" "main" {
  cluster_id      = "${var.project_name}-redis"
  engine          = "redis"
  engine_version  = "7.1"
  node_type       = var.elasticache_node_type
  num_cache_nodes = 1
  port            = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  tags = {
    Name = "${var.project_name}-redis"
  }
}
```

- [ ] **Step 2: Create IAM roles with GitHub Actions OIDC**

Create `terraform/iam.tf`:

```hcl
data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com/.well-known/openid-configuration"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_org}/${var.github_infra_repo}:*"
        }
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "github_actions_eks" {
  name = "${var.project_name}-github-actions-eks"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters",
        ]
        Resource = aws_eks_cluster.main.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sts:GetCallerIdentity",
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "github_actions_terraform" {
  name = "${var.project_name}-github-actions-terraform"
  role = aws_iam_role.github_actions.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ]
        Resource = [
          "arn:aws:s3:::clawbrowser-terraform-state",
          "arn:aws:s3:::clawbrowser-terraform-state/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
        ]
        Resource = "arn:aws:dynamodb:${var.aws_region}:*:table/clawbrowser-terraform-locks"
      }
    ]
  })
}
```

- [ ] **Step 3: Validate**

```bash
cd terraform && terraform validate
```

- [ ] **Step 4: Commit**

```bash
git add terraform/elasticache.tf terraform/iam.tf
git commit -m "feat: add Terraform ElastiCache Redis and IAM OIDC for GitHub Actions"
```

---

### Task 8: Terraform — DNS (Route53)

**Files:**
- Create: `terraform/dns.tf`

- [ ] **Step 1: Create Route53 hosted zone and DNS records**

Create `terraform/dns.tf`:

```hcl
variable "domain" {
  description = "Root domain for clawbrowser"
  type        = string
  default     = "clawbrowser.ai"
}

resource "aws_route53_zone" "main" {
  name = var.domain
}

locals {
  dns_records = {
    # Dev
    "api-dev" = { name = "api-dev.${var.domain}" }
    "dev"     = { name = "dev.${var.domain}" }
    # QA
    "api-qa"  = { name = "api-qa.${var.domain}" }
    "qa"      = { name = "qa.${var.domain}" }
    # Prod
    "api"     = { name = "api.${var.domain}" }
    "root"    = { name = var.domain }
  }
}

data "kubernetes_service" "traefik" {
  metadata {
    name      = "traefik"
    namespace = "kube-system"
  }
}

resource "aws_route53_record" "services" {
  for_each = local.dns_records

  zone_id = aws_route53_zone.main.zone_id
  name    = each.value.name
  type    = "CNAME"
  ttl     = 300
  records = [data.kubernetes_service.traefik.status[0].load_balancer[0].ingress[0].hostname]
}
```

**Note:** The `kubernetes_service` data source requires the Kubernetes provider configured. In practice, you may need to add the `kubernetes` and `helm` providers to `main.tf`. Alternatively, the Traefik LB hostname can be passed as a variable after initial cluster setup. For the root domain (`clawbrowser.ai`), a CNAME is not valid — use an ALIAS record via `aws_route53_record` with `alias` block pointing to the ELB. This can be refined during implementation.

- [ ] **Step 2: Validate**

```bash
cd terraform && terraform validate
```

- [ ] **Step 3: Commit**

```bash
git add terraform/dns.tf
git commit -m "feat: add Route53 DNS records for all environments"
```

---

### Task 9: Kustomize Base — clawbrowser-api

**Files:**
- Create: `k8s/base/clawbrowser-api/deployment.yaml`
- Create: `k8s/base/clawbrowser-api/service.yaml`
- Create: `k8s/base/clawbrowser-api/configmap.yaml`
- Create: `k8s/base/clawbrowser-api/kustomization.yaml`

- [ ] **Step 1: Create deployment**

Create `k8s/base/clawbrowser-api/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
  labels:
    app: clawbrowser-api
spec:
  replicas: 1
  selector:
    matchLabels:
      app: clawbrowser-api
  template:
    metadata:
      labels:
        app: clawbrowser-api
    spec:
      containers:
        - name: clawbrowser-api
          image: clawbrowser/clawbrowser-api:latest
          ports:
            - containerPort: 8080
              name: http
          envFrom:
            - configMapRef:
                name: clawbrowser-api-config
            - secretRef:
                name: clawbrowser-api-secrets
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /readyz
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

- [ ] **Step 2: Create service**

Create `k8s/base/clawbrowser-api/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: clawbrowser-api
  labels:
    app: clawbrowser-api
spec:
  selector:
    app: clawbrowser-api
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
```

- [ ] **Step 3: Create configmap**

Create `k8s/base/clawbrowser-api/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: clawbrowser-api-config
data:
  CLAWBROWSER_SERVER__PORT: "8080"
  CLAWBROWSER_REDIS__TTL__CUSTOMER: "10m"
```

- [ ] **Step 4: Create kustomization**

Create `k8s/base/clawbrowser-api/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
```

- [ ] **Step 5: Validate with kustomize build**

```bash
kustomize build k8s/base/clawbrowser-api/
```

Expected: Valid YAML output of all 3 resources.

- [ ] **Step 6: Commit**

```bash
git add k8s/base/clawbrowser-api/
git commit -m "feat: add Kustomize base for clawbrowser-api"
```

---

### Task 10: Kustomize Base — clawbrowser-dashboard, Unkey, UniBee

**Files:**
- Create: `k8s/base/clawbrowser-dashboard/{deployment,service,kustomization}.yaml`
- Create: `k8s/base/unkey/{deployment,service,kustomization}.yaml`
- Create: `k8s/base/unibee/{deployment,service,kustomization}.yaml`

- [ ] **Step 1: Create clawbrowser-dashboard base**

Create `k8s/base/clawbrowser-dashboard/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-dashboard
  labels:
    app: clawbrowser-dashboard
spec:
  replicas: 1
  selector:
    matchLabels:
      app: clawbrowser-dashboard
  template:
    metadata:
      labels:
        app: clawbrowser-dashboard
    spec:
      containers:
        - name: clawbrowser-dashboard
          image: clawbrowser/clawbrowser-dashboard:latest
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - secretRef:
                name: clawbrowser-dashboard-secrets
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

Create `k8s/base/clawbrowser-dashboard/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: clawbrowser-dashboard
  labels:
    app: clawbrowser-dashboard
spec:
  selector:
    app: clawbrowser-dashboard
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
```

Create `k8s/base/clawbrowser-dashboard/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 2: Create Unkey base**

Create `k8s/base/unkey/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unkey
  labels:
    app: unkey
spec:
  replicas: 1
  selector:
    matchLabels:
      app: unkey
  template:
    metadata:
      labels:
        app: unkey
    spec:
      containers:
        - name: unkey
          image: ghcr.io/unkeyed/unkey:latest
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - secretRef:
                name: unkey-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

Create `k8s/base/unkey/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: unkey
  labels:
    app: unkey
spec:
  selector:
    app: unkey
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
```

Create `k8s/base/unkey/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 3: Create UniBee base**

Create `k8s/base/unibee/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unibee
  labels:
    app: unibee
spec:
  replicas: 1
  selector:
    matchLabels:
      app: unibee
  template:
    metadata:
      labels:
        app: unibee
    spec:
      containers:
        - name: unibee
          image: unibee/unibee:latest
          ports:
            - containerPort: 8088
              name: http
          envFrom:
            - secretRef:
                name: unibee-secrets
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 5
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

Create `k8s/base/unibee/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: unibee
  labels:
    app: unibee
spec:
  selector:
    app: unibee
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
```

Create `k8s/base/unibee/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 4: Validate all bases**

```bash
kustomize build k8s/base/clawbrowser-dashboard/
kustomize build k8s/base/unkey/
kustomize build k8s/base/unibee/
```

Expected: Valid YAML output for each.

- [ ] **Step 5: Commit**

```bash
git add k8s/base/clawbrowser-dashboard/ k8s/base/unkey/ k8s/base/unibee/
git commit -m "feat: add Kustomize bases for dashboard, Unkey, and UniBee"
```

---

### Task 11: Cluster-Wide Services — Traefik

**Files:**
- Create: `k8s/cluster-wide/traefik/{deployment,service,rbac,kustomization}.yaml`

- [ ] **Step 1: Create Traefik RBAC**

Create `k8s/cluster-wide/traefik/rbac.yaml`:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: traefik
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: traefik
rules:
  - apiGroups: [""]
    resources: ["services", "endpoints", "secrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions", "networking.k8s.io"]
    resources: ["ingresses", "ingressclasses"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["extensions", "networking.k8s.io"]
    resources: ["ingresses/status"]
    verbs: ["update"]
  - apiGroups: ["traefik.io", "traefik.containo.us"]
    resources: ["ingressroutes", "ingressroutetcps", "ingressrouteudps",
                "middlewares", "middlewaretcps", "tlsoptions", "tlsstores",
                "traefikservices", "serverstransports"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: traefik
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: traefik
subjects:
  - kind: ServiceAccount
    name: traefik
    namespace: kube-system
```

- [ ] **Step 2: Create Traefik deployment**

Create `k8s/cluster-wide/traefik/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traefik
  namespace: kube-system
  labels:
    app: traefik
spec:
  replicas: 1
  selector:
    matchLabels:
      app: traefik
  template:
    metadata:
      labels:
        app: traefik
    spec:
      serviceAccountName: traefik
      containers:
        - name: traefik
          image: traefik:v3.0
          args:
            - --entrypoints.web.address=:80
            - --entrypoints.websecure.address=:443
            - --entrypoints.traefik.address=:8080
            - --entrypoints.web.http.redirections.entrypoint.to=websecure
            - --entrypoints.web.http.redirections.entrypoint.scheme=https
            - --providers.kubernetescrd
            - --providers.kubernetescrd.allowCrossNamespace=true
            - --certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web
            - --certificatesresolvers.letsencrypt.acme.email=admin@clawbrowser.ai
            - --certificatesresolvers.letsencrypt.acme.storage=/data/acme.json
            - --ping
            - --ping.entryPoint=traefik
            - --api.insecure=false
          ports:
            - containerPort: 80
              name: web
            - containerPort: 443
              name: websecure
            - containerPort: 8080
              name: traefik
          livenessProbe:
            httpGet:
              path: /ping
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ping
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
          resources:
            requests:
              cpu: 128m
              memory: 128Mi
            limits:
              cpu: 128m
              memory: 128Mi
          volumeMounts:
            - name: acme-data
              mountPath: /data
      volumes:
        - name: acme-data
          persistentVolumeClaim:
            claimName: traefik-acme-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: traefik-acme-data
  namespace: kube-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```

- [ ] **Step 3: Create Traefik service**

Create `k8s/cluster-wide/traefik/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: traefik
  namespace: kube-system
  labels:
    app: traefik
spec:
  type: LoadBalancer
  selector:
    app: traefik
  ports:
    - port: 80
      targetPort: web
      name: web
    - port: 443
      targetPort: websecure
      name: websecure
```

- [ ] **Step 4: Create Traefik kustomization**

Create `k8s/cluster-wide/traefik/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - rbac.yaml
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 5: Validate**

```bash
kustomize build k8s/cluster-wide/traefik/
```

Expected: Valid YAML output.

- [ ] **Step 6: Commit**

```bash
git add k8s/cluster-wide/traefik/
git commit -m "feat: add cluster-wide Traefik deployment with ACME TLS"
```

---

### Task 12: Cluster-Wide Services — Sealed Secrets Controller

**Files:**
- Create: `k8s/cluster-wide/sealed-secrets-controller/{deployment,kustomization}.yaml`

- [ ] **Step 1: Create Sealed Secrets controller deployment**

Create `k8s/cluster-wide/sealed-secrets-controller/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sealed-secrets-controller
  namespace: kube-system
  labels:
    app: sealed-secrets
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sealed-secrets
  template:
    metadata:
      labels:
        app: sealed-secrets
    spec:
      serviceAccountName: sealed-secrets-controller
      containers:
        - name: sealed-secrets-controller
          image: bitnami/sealed-secrets-controller:0.26.1
          ports:
            - containerPort: 8080
              name: http
          args:
            - --update-status
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            initialDelaySeconds: 5
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: sealed-secrets-controller
  namespace: kube-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: sealed-secrets-controller
rules:
  - apiGroups: ["bitnami.com"]
    resources: ["sealedsecrets"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["bitnami.com"]
    resources: ["sealedsecrets/status"]
    verbs: ["update"]
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "list", "create", "update", "delete", "watch"]
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["create", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: sealed-secrets-controller
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: sealed-secrets-controller
subjects:
  - kind: ServiceAccount
    name: sealed-secrets-controller
    namespace: kube-system
---
apiVersion: v1
kind: Service
metadata:
  name: sealed-secrets-controller
  namespace: kube-system
spec:
  selector:
    app: sealed-secrets
  ports:
    - port: 8080
      targetPort: http
```

- [ ] **Step 2: Create kustomization**

Create `k8s/cluster-wide/sealed-secrets-controller/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
```

- [ ] **Step 3: Commit**

```bash
git add k8s/cluster-wide/sealed-secrets-controller/
git commit -m "feat: add Sealed Secrets controller for cluster-wide secret management"
```

---

### Task 13: Cluster-Wide Services — Observability Stack

**Files:**
- Create: `k8s/cluster-wide/observability/namespace.yaml`
- Create: `k8s/cluster-wide/observability/victoriametrics/{deployment,service,kustomization}.yaml`
- Create: `k8s/cluster-wide/observability/victorialogs/{deployment,service,kustomization}.yaml`
- Create: `k8s/cluster-wide/observability/grafana/{deployment,service,datasources,kustomization}.yaml`
- Create: `k8s/cluster-wide/observability/fluent-bit/{daemonset,configmap,kustomization}.yaml`
- Create: `k8s/cluster-wide/observability/kustomization.yaml`

- [ ] **Step 1: Create observability namespace**

Create `k8s/cluster-wide/observability/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: observability
```

- [ ] **Step 2: Create VictoriaMetrics**

Create `k8s/cluster-wide/observability/victoriametrics/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: victoriametrics
  namespace: observability
  labels:
    app: victoriametrics
spec:
  replicas: 1
  selector:
    matchLabels:
      app: victoriametrics
  template:
    metadata:
      labels:
        app: victoriametrics
    spec:
      containers:
        - name: victoriametrics
          image: victoriametrics/victoria-metrics:v1.99.0
          args:
            - -storageDataPath=/data
            - -retentionPeriod=30d
            - -promscrape.config=/config/scrape.yaml
          ports:
            - containerPort: 8428
              name: http
          volumeMounts:
            - name: data
              mountPath: /data
            - name: config
              mountPath: /config
          resources:
            requests:
              cpu: 200m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 1Gi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: victoriametrics-data
        - name: config
          configMap:
            name: victoriametrics-config
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: victoriametrics-data
  namespace: observability
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: victoriametrics-config
  namespace: observability
data:
  scrape.yaml: |
    scrape_configs:
      - job_name: clawbrowser-api
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            regex: clawbrowser-api
            action: keep
          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
        metrics_path: /metrics
```

Create `k8s/cluster-wide/observability/victoriametrics/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: victoriametrics
  namespace: observability
spec:
  selector:
    app: victoriametrics
  ports:
    - port: 8428
      targetPort: http
      name: http
```

Create `k8s/cluster-wide/observability/victoriametrics/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 3: Create VictoriaLogs**

Create `k8s/cluster-wide/observability/victorialogs/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: victorialogs
  namespace: observability
  labels:
    app: victorialogs
spec:
  replicas: 1
  selector:
    matchLabels:
      app: victorialogs
  template:
    metadata:
      labels:
        app: victorialogs
    spec:
      containers:
        - name: victorialogs
          image: victoriametrics/victoria-logs:v0.15.0-victorialogs
          args:
            - -storageDataPath=/data
            - -retentionPeriod=30d
          ports:
            - containerPort: 9428
              name: http
          volumeMounts:
            - name: data
              mountPath: /data
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 250m
              memory: 512Mi
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: victorialogs-data
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: victorialogs-data
  namespace: observability
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 50Gi
```

Create `k8s/cluster-wide/observability/victorialogs/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: victorialogs
  namespace: observability
spec:
  selector:
    app: victorialogs
  ports:
    - port: 9428
      targetPort: http
      name: http
```

Create `k8s/cluster-wide/observability/victorialogs/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 4: Create Grafana with datasources**

Create `k8s/cluster-wide/observability/grafana/datasources.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: observability
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
      - name: VictoriaMetrics
        type: prometheus
        url: http://victoriametrics.observability.svc.cluster.local:8428
        access: proxy
        isDefault: true
      - name: VictoriaLogs
        type: victoriametrics-logs-datasource
        url: http://victorialogs.observability.svc.cluster.local:9428
        access: proxy
```

Create `k8s/cluster-wide/observability/grafana/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: observability
  labels:
    app: grafana
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
        - name: grafana
          image: grafana/grafana:10.4.0
          ports:
            - containerPort: 3000
              name: http
          env:
            - name: GF_SECURITY_ADMIN_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: grafana-secrets
                  key: admin-password
          volumeMounts:
            - name: datasources
              mountPath: /etc/grafana/provisioning/datasources
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 250m
              memory: 512Mi
      volumes:
        - name: datasources
          configMap:
            name: grafana-datasources
```

Create `k8s/cluster-wide/observability/grafana/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: observability
spec:
  selector:
    app: grafana
  ports:
    - port: 3000
      targetPort: http
      name: http
```

Create `k8s/cluster-wide/observability/grafana/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - datasources.yaml
  - deployment.yaml
  - service.yaml
```

- [ ] **Step 5: Create Fluent Bit DaemonSet**

Create `k8s/cluster-wide/observability/fluent-bit/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
  namespace: observability
data:
  fluent-bit.conf: |
    [SERVICE]
        Flush        1
        Log_Level    info
        Daemon       off
        Parsers_File parsers.conf

    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            cri
        Tag               kube.*
        Mem_Buf_Limit     5MB
        Skip_Long_Lines   On
        Refresh_Interval  10

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Kube_CA_File        /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
        Kube_Token_File     /var/run/secrets/kubernetes.io/serviceaccount/token
        Merge_Log           On
        K8S-Logging.Parser  On

    [OUTPUT]
        Name              http
        Match             *
        Host              victorialogs.observability.svc.cluster.local
        Port              9428
        URI               /insert/jsonline?_stream_fields=kubernetes_namespace_name,kubernetes_pod_name,kubernetes_container_name
        Format            json_lines
        Json_Date_Key     _time
        Json_Date_Format  iso8601

  parsers.conf: |
    [PARSER]
        Name        cri
        Format      regex
        Regex       ^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$
        Time_Key    time
        Time_Format %Y-%m-%dT%H:%M:%S.%L%z
```

Create `k8s/cluster-wide/observability/fluent-bit/daemonset.yaml`:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: fluent-bit
  namespace: observability
  labels:
    app: fluent-bit
spec:
  selector:
    matchLabels:
      app: fluent-bit
  template:
    metadata:
      labels:
        app: fluent-bit
    spec:
      serviceAccountName: fluent-bit
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:3.0
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
            - name: config
              mountPath: /fluent-bit/etc/
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 100m
              memory: 128Mi
      volumes:
        - name: varlog
          hostPath:
            path: /var/log
        - name: config
          configMap:
            name: fluent-bit-config
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: fluent-bit
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: fluent-bit
rules:
  - apiGroups: [""]
    resources: ["namespaces", "pods"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: fluent-bit
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: fluent-bit
subjects:
  - kind: ServiceAccount
    name: fluent-bit
    namespace: observability
```

Create `k8s/cluster-wide/observability/fluent-bit/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - configmap.yaml
  - daemonset.yaml
```

- [ ] **Step 6: Create observability kustomization**

Create `k8s/cluster-wide/observability/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - victoriametrics/
  - victorialogs/
  - grafana/
  - fluent-bit/
```

- [ ] **Step 7: Validate**

```bash
kustomize build k8s/cluster-wide/observability/
```

Expected: Valid YAML output.

- [ ] **Step 8: Commit**

```bash
git add k8s/cluster-wide/observability/
git commit -m "feat: add observability stack (VictoriaMetrics, VictoriaLogs, Grafana, Fluent Bit)"
```

---

### Task 14: Cluster-Wide Kustomization Root

**Files:**
- Create: `k8s/cluster-wide/kustomization.yaml`

- [ ] **Step 1: Create root kustomization for cluster-wide resources**

Create `k8s/cluster-wide/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - traefik/
  - sealed-secrets-controller/
  - observability/
```

- [ ] **Step 2: Validate**

```bash
kustomize build k8s/cluster-wide/
```

Expected: Valid YAML output with all cluster-wide resources.

- [ ] **Step 3: Commit**

```bash
git add k8s/cluster-wide/kustomization.yaml
git commit -m "feat: add cluster-wide Kustomization root"
```

---

### Task 15: Kustomize Overlay — Dev Environment

**Files:**
- Create: `k8s/overlays/dev/namespace.yaml`
- Create: `k8s/overlays/dev/network-policy.yaml`
- Create: `k8s/overlays/dev/kustomization.yaml`
- Create: `k8s/overlays/dev/clawbrowser-api/patches/{resources,env}.yaml`
- Create: `k8s/overlays/dev/clawbrowser-api/sealed-secrets/secrets.yaml`
- Create: `k8s/overlays/dev/clawbrowser-dashboard/patches/{resources,env}.yaml`
- Create: `k8s/overlays/dev/clawbrowser-dashboard/sealed-secrets/secrets.yaml`
- Create: `k8s/overlays/dev/unkey/patches/{resources,env}.yaml`
- Create: `k8s/overlays/dev/unkey/sealed-secrets/secrets.yaml`
- Create: `k8s/overlays/dev/unibee/patches/{resources,env}.yaml`
- Create: `k8s/overlays/dev/unibee/sealed-secrets/secrets.yaml`
- Create: `k8s/overlays/dev/traefik/ingress-routes.yaml`

- [ ] **Step 1: Create namespace and network policy**

Create `k8s/overlays/dev/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: clawbrowser-dev
```

Create `k8s/overlays/dev/network-policy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: clawbrowser-dev
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              app: traefik
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: observability
```

- [ ] **Step 2: Create clawbrowser-api overlay patches**

Create `k8s/overlays/dev/clawbrowser-api/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: clawbrowser-api
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

Create `k8s/overlays/dev/clawbrowser-api/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
spec:
  template:
    spec:
      containers:
        - name: clawbrowser-api
          env:
            - name: CLAWBROWSER_MAILERSEND__FROM
              value: "noreply-dev@clawbrowser.ai"
            - name: CLAWBROWSER_REDIS__DB
              value: "0"
```

Create `k8s/overlays/dev/clawbrowser-api/sealed-secrets/secrets.yaml`:

```yaml
# Placeholder — seal with: ./scripts/seal-secret.sh dev clawbrowser-api <key> <value>
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: clawbrowser-api-secrets
  namespace: clawbrowser-dev
spec:
  encryptedData: {}
  template:
    metadata:
      name: clawbrowser-api-secrets
      namespace: clawbrowser-dev
```

- [ ] **Step 3: Create clawbrowser-dashboard overlay patches**

Create `k8s/overlays/dev/clawbrowser-dashboard/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-dashboard
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: clawbrowser-dashboard
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

Create `k8s/overlays/dev/clawbrowser-dashboard/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-dashboard
spec:
  template:
    spec:
      containers:
        - name: clawbrowser-dashboard
          env:
            - name: NEXT_PUBLIC_API_URL
              value: "https://api-dev.clawbrowser.ai"
```

Create `k8s/overlays/dev/clawbrowser-dashboard/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: clawbrowser-dashboard-secrets
  namespace: clawbrowser-dev
spec:
  encryptedData: {}
  template:
    metadata:
      name: clawbrowser-dashboard-secrets
      namespace: clawbrowser-dev
```

- [ ] **Step 4: Create Unkey and UniBee overlay patches**

Create `k8s/overlays/dev/unkey/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unkey
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: unkey
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

Create `k8s/overlays/dev/unkey/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unkey
spec:
  template:
    spec:
      containers:
        - name: unkey
          env:
            - name: REDIS_DB
              value: "3"
```

Create `k8s/overlays/dev/unkey/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: unkey-secrets
  namespace: clawbrowser-dev
spec:
  encryptedData: {}
  template:
    metadata:
      name: unkey-secrets
      namespace: clawbrowser-dev
```

Create `k8s/overlays/dev/unibee/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unibee
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: unibee
          resources:
            requests:
              cpu: 128m
              memory: 256Mi
            limits:
              cpu: 128m
              memory: 256Mi
```

Create `k8s/overlays/dev/unibee/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unibee
spec:
  template:
    spec:
      containers:
        - name: unibee
          env:
            - name: REDIS_DB
              value: "6"
```

Create `k8s/overlays/dev/unibee/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: unibee-secrets
  namespace: clawbrowser-dev
spec:
  encryptedData: {}
  template:
    metadata:
      name: unibee-secrets
      namespace: clawbrowser-dev
```

- [ ] **Step 5: Create Traefik IngressRoutes for dev**

Create `k8s/overlays/dev/traefik/ingress-routes.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-api-dev
  namespace: clawbrowser-dev
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api-dev.clawbrowser.ai`) && PathPrefix(`/v1`)
      kind: Rule
      services:
        - name: clawbrowser-api
          port: 80
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-dashboard-dev
  namespace: clawbrowser-dev
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`dev.clawbrowser.ai`)
      kind: Rule
      services:
        - name: clawbrowser-dashboard
          port: 80
  tls:
    certResolver: letsencrypt
```

- [ ] **Step 6: Create ForwardAuth middleware for dev**

Create `k8s/overlays/dev/traefik/forward-auth.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: forward-auth
  namespace: clawbrowser-dev
spec:
  forwardAuth:
    address: http://clawbrowser-api.clawbrowser-dev.svc.cluster.local/auth/verify
    authResponseHeaders:
      - X-User-Id
```

Update `k8s/overlays/dev/traefik/ingress-routes.yaml` to split dashboard into public + authenticated routes with ForwardAuth:

Replace the dashboard IngressRoute in `k8s/overlays/dev/traefik/ingress-routes.yaml` so the full file is:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-api-dev
  namespace: clawbrowser-dev
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api-dev.clawbrowser.ai`) && PathPrefix(`/v1`)
      kind: Rule
      services:
        - name: clawbrowser-api
          port: 80
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-dashboard-dev-public
  namespace: clawbrowser-dev
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`dev.clawbrowser.ai`) && (Path(`/`) || PathPrefix(`/login`) || PathPrefix(`/signup`) || PathPrefix(`/_next`) || PathPrefix(`/favicon.ico`))
      kind: Rule
      services:
        - name: clawbrowser-dashboard
          port: 80
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-dashboard-dev-auth
  namespace: clawbrowser-dev
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`dev.clawbrowser.ai`)
      kind: Rule
      middlewares:
        - name: forward-auth
      services:
        - name: clawbrowser-dashboard
          port: 80
  tls:
    certResolver: letsencrypt
```

- [ ] **Step 7: Create dev overlay kustomization**

Create `k8s/overlays/dev/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: clawbrowser-dev
resources:
  - namespace.yaml
  - network-policy.yaml
  - ../../base/clawbrowser-api
  - ../../base/clawbrowser-dashboard
  - ../../base/unkey
  - ../../base/unibee
  - clawbrowser-api/sealed-secrets/secrets.yaml
  - clawbrowser-dashboard/sealed-secrets/secrets.yaml
  - unkey/sealed-secrets/secrets.yaml
  - unibee/sealed-secrets/secrets.yaml
  - traefik/ingress-routes.yaml
  - traefik/forward-auth.yaml
patches:
  - path: clawbrowser-api/patches/resources.yaml
  - path: clawbrowser-api/patches/env.yaml
  - path: clawbrowser-dashboard/patches/resources.yaml
  - path: clawbrowser-dashboard/patches/env.yaml
  - path: unkey/patches/resources.yaml
  - path: unkey/patches/env.yaml
  - path: unibee/patches/resources.yaml
  - path: unibee/patches/env.yaml
```

- [ ] **Step 8: Validate**

```bash
kustomize build k8s/overlays/dev/
```

Expected: Valid YAML output with all dev-environment resources, namespaced to `clawbrowser-dev`.

- [ ] **Step 9: Commit**

```bash
git add k8s/overlays/dev/
git commit -m "feat: add Kustomize dev overlay with patches, sealed secrets, ForwardAuth, and ingress routes"
```

---

### Task 16: Kustomize Overlay — QA Environment

**Files:**
- Create: `k8s/overlays/qa/` (same structure as dev with QA-specific values)

- [ ] **Step 1: Create QA overlay (copy dev, update values)**

Create `k8s/overlays/qa/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: clawbrowser-qa
```

Create `k8s/overlays/qa/network-policy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: clawbrowser-qa
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              app: traefik
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: observability
```

Create `k8s/overlays/qa/clawbrowser-api/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: clawbrowser-api
          resources:
            requests:
              cpu: 256m
              memory: 512Mi
            limits:
              cpu: 256m
              memory: 512Mi
```

Create `k8s/overlays/qa/clawbrowser-api/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
spec:
  template:
    spec:
      containers:
        - name: clawbrowser-api
          env:
            - name: CLAWBROWSER_MAILERSEND__FROM
              value: "noreply-qa@clawbrowser.ai"
            - name: CLAWBROWSER_REDIS__DB
              value: "1"
```

Create `k8s/overlays/qa/clawbrowser-api/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: clawbrowser-api-secrets
  namespace: clawbrowser-qa
spec:
  encryptedData: {}
  template:
    metadata:
      name: clawbrowser-api-secrets
      namespace: clawbrowser-qa
```

Create `k8s/overlays/qa/clawbrowser-dashboard/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-dashboard
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: clawbrowser-dashboard
          resources:
            requests:
              cpu: 256m
              memory: 512Mi
            limits:
              cpu: 256m
              memory: 512Mi
```

Create `k8s/overlays/qa/clawbrowser-dashboard/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-dashboard
spec:
  template:
    spec:
      containers:
        - name: clawbrowser-dashboard
          env:
            - name: NEXT_PUBLIC_API_URL
              value: "https://api-qa.clawbrowser.ai"
```

Create `k8s/overlays/qa/clawbrowser-dashboard/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: clawbrowser-dashboard-secrets
  namespace: clawbrowser-qa
spec:
  encryptedData: {}
  template:
    metadata:
      name: clawbrowser-dashboard-secrets
      namespace: clawbrowser-qa
```

Create `k8s/overlays/qa/unkey/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unkey
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: unkey
          resources:
            requests:
              cpu: 256m
              memory: 512Mi
            limits:
              cpu: 256m
              memory: 512Mi
```

Create `k8s/overlays/qa/unkey/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unkey
spec:
  template:
    spec:
      containers:
        - name: unkey
          env:
            - name: REDIS_DB
              value: "4"
```

Create `k8s/overlays/qa/unkey/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: unkey-secrets
  namespace: clawbrowser-qa
spec:
  encryptedData: {}
  template:
    metadata:
      name: unkey-secrets
      namespace: clawbrowser-qa
```

Create `k8s/overlays/qa/unibee/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unibee
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: unibee
          resources:
            requests:
              cpu: 256m
              memory: 512Mi
            limits:
              cpu: 256m
              memory: 512Mi
```

Create `k8s/overlays/qa/unibee/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unibee
spec:
  template:
    spec:
      containers:
        - name: unibee
          env:
            - name: REDIS_DB
              value: "7"
```

Create `k8s/overlays/qa/unibee/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: unibee-secrets
  namespace: clawbrowser-qa
spec:
  encryptedData: {}
  template:
    metadata:
      name: unibee-secrets
      namespace: clawbrowser-qa
```

Create `k8s/overlays/qa/traefik/forward-auth.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: forward-auth
  namespace: clawbrowser-qa
spec:
  forwardAuth:
    address: http://clawbrowser-api.clawbrowser-qa.svc.cluster.local/auth/verify
    authResponseHeaders:
      - X-User-Id
```

Create `k8s/overlays/qa/traefik/ingress-routes.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-api-qa
  namespace: clawbrowser-qa
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api-qa.clawbrowser.ai`) && PathPrefix(`/v1`)
      kind: Rule
      services:
        - name: clawbrowser-api
          port: 80
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-dashboard-qa-public
  namespace: clawbrowser-qa
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`qa.clawbrowser.ai`) && (Path(`/`) || PathPrefix(`/login`) || PathPrefix(`/signup`) || PathPrefix(`/_next`) || PathPrefix(`/favicon.ico`))
      kind: Rule
      services:
        - name: clawbrowser-dashboard
          port: 80
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-dashboard-qa-auth
  namespace: clawbrowser-qa
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`qa.clawbrowser.ai`)
      kind: Rule
      middlewares:
        - name: forward-auth
      services:
        - name: clawbrowser-dashboard
          port: 80
  tls:
    certResolver: letsencrypt
```

Create `k8s/overlays/qa/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: clawbrowser-qa
resources:
  - namespace.yaml
  - network-policy.yaml
  - ../../base/clawbrowser-api
  - ../../base/clawbrowser-dashboard
  - ../../base/unkey
  - ../../base/unibee
  - clawbrowser-api/sealed-secrets/secrets.yaml
  - clawbrowser-dashboard/sealed-secrets/secrets.yaml
  - unkey/sealed-secrets/secrets.yaml
  - unibee/sealed-secrets/secrets.yaml
  - traefik/ingress-routes.yaml
  - traefik/forward-auth.yaml
patches:
  - path: clawbrowser-api/patches/resources.yaml
  - path: clawbrowser-api/patches/env.yaml
  - path: clawbrowser-dashboard/patches/resources.yaml
  - path: clawbrowser-dashboard/patches/env.yaml
  - path: unkey/patches/resources.yaml
  - path: unkey/patches/env.yaml
  - path: unibee/patches/resources.yaml
  - path: unibee/patches/env.yaml
```

- [ ] **Step 2: Validate**

```bash
kustomize build k8s/overlays/qa/
```

Expected: Valid YAML output namespaced to `clawbrowser-qa`.

- [ ] **Step 3: Commit**

```bash
git add k8s/overlays/qa/
git commit -m "feat: add Kustomize QA overlay with patches, sealed secrets, ForwardAuth, and ingress routes"
```

---

### Task 17: Kustomize Overlay — Prod Environment

**Files:**
- Create: `k8s/overlays/prod/` (same structure as dev/qa with prod-specific values)

- [ ] **Step 1: Create prod overlay with production resource limits and replicas**

Create `k8s/overlays/prod/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: clawbrowser-prod
```

Create `k8s/overlays/prod/network-policy.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-cross-namespace
  namespace: clawbrowser-prod
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - podSelector: {}
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              app: traefik
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: observability
```

Create `k8s/overlays/prod/clawbrowser-api/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: clawbrowser-api
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 500m
              memory: 1Gi
```

Create `k8s/overlays/prod/clawbrowser-api/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-api
spec:
  template:
    spec:
      containers:
        - name: clawbrowser-api
          env:
            - name: CLAWBROWSER_MAILERSEND__FROM
              value: "noreply@clawbrowser.ai"
            - name: CLAWBROWSER_REDIS__DB
              value: "2"
```

Create `k8s/overlays/prod/clawbrowser-api/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: clawbrowser-api-secrets
  namespace: clawbrowser-prod
spec:
  encryptedData: {}
  template:
    metadata:
      name: clawbrowser-api-secrets
      namespace: clawbrowser-prod
```

Create `k8s/overlays/prod/clawbrowser-dashboard/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-dashboard
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: clawbrowser-dashboard
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 500m
              memory: 1Gi
```

Create `k8s/overlays/prod/clawbrowser-dashboard/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: clawbrowser-dashboard
spec:
  template:
    spec:
      containers:
        - name: clawbrowser-dashboard
          env:
            - name: NEXT_PUBLIC_API_URL
              value: "https://api.clawbrowser.ai"
```

Create `k8s/overlays/prod/clawbrowser-dashboard/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: clawbrowser-dashboard-secrets
  namespace: clawbrowser-prod
spec:
  encryptedData: {}
  template:
    metadata:
      name: clawbrowser-dashboard-secrets
      namespace: clawbrowser-prod
```

Create `k8s/overlays/prod/unkey/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unkey
spec:
  replicas: 2
  template:
    spec:
      containers:
        - name: unkey
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 500m
              memory: 1Gi
```

Create `k8s/overlays/prod/unkey/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unkey
spec:
  template:
    spec:
      containers:
        - name: unkey
          env:
            - name: REDIS_DB
              value: "5"
```

Create `k8s/overlays/prod/unkey/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: unkey-secrets
  namespace: clawbrowser-prod
spec:
  encryptedData: {}
  template:
    metadata:
      name: unkey-secrets
      namespace: clawbrowser-prod
```

Create `k8s/overlays/prod/unibee/patches/resources.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unibee
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: unibee
          resources:
            requests:
              cpu: 500m
              memory: 1Gi
            limits:
              cpu: 500m
              memory: 1Gi
```

Create `k8s/overlays/prod/unibee/patches/env.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: unibee
spec:
  template:
    spec:
      containers:
        - name: unibee
          env:
            - name: REDIS_DB
              value: "8"
```

Create `k8s/overlays/prod/unibee/sealed-secrets/secrets.yaml`:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: unibee-secrets
  namespace: clawbrowser-prod
spec:
  encryptedData: {}
  template:
    metadata:
      name: unibee-secrets
      namespace: clawbrowser-prod
```

Create `k8s/overlays/prod/traefik/forward-auth.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: forward-auth
  namespace: clawbrowser-prod
spec:
  forwardAuth:
    address: http://clawbrowser-api.clawbrowser-prod.svc.cluster.local/auth/verify
    authResponseHeaders:
      - X-User-Id
```

Create `k8s/overlays/prod/traefik/ingress-routes.yaml`:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-api-prod
  namespace: clawbrowser-prod
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`api.clawbrowser.ai`) && PathPrefix(`/v1`)
      kind: Rule
      services:
        - name: clawbrowser-api
          port: 80
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-dashboard-prod-public
  namespace: clawbrowser-prod
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`clawbrowser.ai`) && (Path(`/`) || PathPrefix(`/login`) || PathPrefix(`/signup`) || PathPrefix(`/_next`) || PathPrefix(`/favicon.ico`))
      kind: Rule
      services:
        - name: clawbrowser-dashboard
          port: 80
  tls:
    certResolver: letsencrypt
---
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: clawbrowser-dashboard-prod-auth
  namespace: clawbrowser-prod
spec:
  entryPoints:
    - websecure
  routes:
    - match: Host(`clawbrowser.ai`)
      kind: Rule
      middlewares:
        - name: forward-auth
      services:
        - name: clawbrowser-dashboard
          port: 80
  tls:
    certResolver: letsencrypt
```

Create `k8s/overlays/prod/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: clawbrowser-prod
resources:
  - namespace.yaml
  - network-policy.yaml
  - ../../base/clawbrowser-api
  - ../../base/clawbrowser-dashboard
  - ../../base/unkey
  - ../../base/unibee
  - clawbrowser-api/sealed-secrets/secrets.yaml
  - clawbrowser-dashboard/sealed-secrets/secrets.yaml
  - unkey/sealed-secrets/secrets.yaml
  - unibee/sealed-secrets/secrets.yaml
  - traefik/ingress-routes.yaml
  - traefik/forward-auth.yaml
patches:
  - path: clawbrowser-api/patches/resources.yaml
  - path: clawbrowser-api/patches/env.yaml
  - path: clawbrowser-dashboard/patches/resources.yaml
  - path: clawbrowser-dashboard/patches/env.yaml
  - path: unkey/patches/resources.yaml
  - path: unkey/patches/env.yaml
  - path: unibee/patches/resources.yaml
  - path: unibee/patches/env.yaml
```

- [ ] **Step 2: Validate**

```bash
kustomize build k8s/overlays/prod/
```

Expected: Valid YAML output namespaced to `clawbrowser-prod`, with prod replicas (2 for api, dashboard, unkey; 1 for unibee) and resource limits (500m/1Gi).

- [ ] **Step 3: Commit**

```bash
git add k8s/overlays/prod/
git commit -m "feat: add Kustomize prod overlay with production resource limits and replicas"
```

---

### Task 18: Helper Scripts

**Files:**
- Create: `scripts/seal-secret.sh`
- Create: `scripts/check-sealed-only.sh`
- Create: `scripts/deploy.sh`

- [ ] **Step 1: Create seal-secret.sh**

Create `scripts/seal-secret.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/seal-secret.sh <env> <service> <key> <value>
# Example: ./scripts/seal-secret.sh dev clawbrowser-api db-password "postgres://..."

if [ "$#" -ne 4 ]; then
  echo "Usage: $0 <env> <service> <key> <value>"
  echo "Example: $0 dev clawbrowser-api db-password 'postgres://user:pass@host/db'"
  exit 1
fi

ENV="$1"
SERVICE="$2"
KEY="$3"
VALUE="$4"
NAMESPACE="clawbrowser-${ENV}"
SECRET_NAME="${SERVICE}-secrets"
OUTPUT_DIR="k8s/overlays/${ENV}/${SERVICE}/sealed-secrets"

if [ ! -d "$OUTPUT_DIR" ]; then
  echo "Error: directory ${OUTPUT_DIR} does not exist"
  exit 1
fi

echo -n "$VALUE" | kubectl create secret generic "$SECRET_NAME" \
  --namespace="$NAMESPACE" \
  --from-file="$KEY=/dev/stdin" \
  --dry-run=client \
  -o yaml | \
  kubeseal \
    --format yaml \
    --merge-into "${OUTPUT_DIR}/secrets.yaml"

echo "Sealed secret '${KEY}' merged into ${OUTPUT_DIR}/secrets.yaml"
```

- [ ] **Step 2: Create check-sealed-only.sh**

Create `scripts/check-sealed-only.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Validates that all files under sealed-secrets/ directories contain
# only kind: SealedSecret, never plain kind: Secret

EXIT_CODE=0

while IFS= read -r -d '' file; do
  if grep -q 'kind: Secret' "$file" && ! grep -q 'kind: SealedSecret' "$file"; then
    echo "ERROR: $file contains plain 'kind: Secret' — must be 'kind: SealedSecret'"
    EXIT_CODE=1
  fi
done < <(find k8s/ -path '*/sealed-secrets/*' -name '*.yaml' -print0)

if [ "$EXIT_CODE" -eq 0 ]; then
  echo "All sealed-secrets files are valid (SealedSecret only)"
fi

exit $EXIT_CODE
```

- [ ] **Step 3: Create deploy.sh**

Create `scripts/deploy.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/deploy.sh <env> [service] [image_tag]
# Example: ./scripts/deploy.sh qa clawbrowser-api v1.2.3-42-abc123f

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <env> [service] [image_tag]"
  echo "  env: dev | qa | prod"
  echo "  service: clawbrowser-api | clawbrowser-dashboard (optional)"
  echo "  image_tag: Docker image tag (optional, requires service)"
  exit 1
fi

ENV="$1"
SERVICE="${2:-}"
IMAGE_TAG="${3:-}"
NAMESPACE="clawbrowser-${ENV}"

echo "Deploying to ${ENV} (namespace: ${NAMESPACE})"

# If a specific service and image tag are provided, update the overlay
if [ -n "$SERVICE" ] && [ -n "$IMAGE_TAG" ]; then
  echo "Updating ${SERVICE} image to ${IMAGE_TAG}"
  cd "k8s/overlays/${ENV}"
  kustomize edit set image "clawbrowser/${SERVICE}=clawbrowser/${SERVICE}:${IMAGE_TAG}"
  cd - > /dev/null
fi

# Build and apply Kustomize overlay
kustomize build "k8s/overlays/${ENV}/" | kubectl apply -f - --namespace="$NAMESPACE"

echo "Waiting for rollout..."
kubectl rollout status deployment/clawbrowser-api --namespace="$NAMESPACE" --timeout=120s
kubectl rollout status deployment/clawbrowser-dashboard --namespace="$NAMESPACE" --timeout=120s

echo "Deploy to ${ENV} complete"
```

- [ ] **Step 4: Make scripts executable**

```bash
chmod +x scripts/seal-secret.sh scripts/check-sealed-only.sh scripts/deploy.sh
```

- [ ] **Step 5: Validate with shellcheck**

```bash
shellcheck scripts/*.sh
```

Expected: No errors (install shellcheck if not available: `brew install shellcheck`).

- [ ] **Step 6: Commit**

```bash
git add scripts/
git commit -m "feat: add helper scripts for sealing secrets, validation, and deployment"
```

---

### Task 19: GitHub Actions — Deploy API Workflow

**Files:**
- Create: `.github/workflows/deploy-api.yaml`

- [ ] **Step 1: Create deploy-api workflow**

Create `.github/workflows/deploy-api.yaml`:

```yaml
name: Deploy API to QA

on:
  repository_dispatch:
    types: [deploy-api]

permissions:
  id-token: write
  contents: write

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER: clawbrowser-eks

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER }} --region ${{ env.AWS_REGION }}

      - name: Update QA overlay image tag
        run: |
          IMAGE_TAG="${{ github.event.client_payload.image_tag }}"
          cd k8s/overlays/qa
          kustomize edit set image clawbrowser/clawbrowser-api=clawbrowser/clawbrowser-api:${IMAGE_TAG}

      - name: Deploy to QA
        run: |
          kustomize build k8s/overlays/qa/ | kubectl apply -f -
          kubectl rollout status deployment/clawbrowser-api -n clawbrowser-qa --timeout=120s

      - name: Commit updated overlay
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add k8s/overlays/qa/
          git diff --staged --quiet || git commit -m "deploy: update clawbrowser-api QA image to ${{ github.event.client_payload.image_tag }}"
          git push
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-api.yaml
git commit -m "feat: add GitHub Actions workflow for deploying API to QA"
```

---

### Task 20: GitHub Actions — Deploy Dashboard Workflow

**Files:**
- Create: `.github/workflows/deploy-dashboard.yaml`

- [ ] **Step 1: Create deploy-dashboard workflow**

Create `.github/workflows/deploy-dashboard.yaml`:

```yaml
name: Deploy Dashboard to QA

on:
  repository_dispatch:
    types: [deploy-dashboard]

permissions:
  id-token: write
  contents: write

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER: clawbrowser-eks

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER }} --region ${{ env.AWS_REGION }}

      - name: Update QA overlay image tag
        run: |
          IMAGE_TAG="${{ github.event.client_payload.image_tag }}"
          cd k8s/overlays/qa
          kustomize edit set image clawbrowser/clawbrowser-dashboard=clawbrowser/clawbrowser-dashboard:${IMAGE_TAG}

      - name: Deploy to QA
        run: |
          kustomize build k8s/overlays/qa/ | kubectl apply -f -
          kubectl rollout status deployment/clawbrowser-dashboard -n clawbrowser-qa --timeout=120s

      - name: Commit updated overlay
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add k8s/overlays/qa/
          git diff --staged --quiet || git commit -m "deploy: update clawbrowser-dashboard QA image to ${{ github.event.client_payload.image_tag }}"
          git push
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-dashboard.yaml
git commit -m "feat: add GitHub Actions workflow for deploying dashboard to QA"
```

---

### Task 21: GitHub Actions — Deploy Dev (Manual) + Promote Prod

**Files:**
- Create: `.github/workflows/deploy-dev.yaml`
- Create: `.github/workflows/promote-prod.yaml`

- [ ] **Step 1: Create deploy-dev manual workflow**

Create `.github/workflows/deploy-dev.yaml`:

```yaml
name: Deploy to Dev

on:
  workflow_dispatch:
    inputs:
      service:
        description: "Service to deploy"
        required: true
        type: choice
        options:
          - clawbrowser-api
          - clawbrowser-dashboard
      image_tag:
        description: "Docker image tag (e.g., v1.2.3-42-abc123f)"
        required: true
        type: string

permissions:
  id-token: write
  contents: write

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER: clawbrowser-eks

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER }} --region ${{ env.AWS_REGION }}

      - name: Update dev overlay image tag
        run: |
          cd k8s/overlays/dev
          kustomize edit set image clawbrowser/${{ inputs.service }}=clawbrowser/${{ inputs.service }}:${{ inputs.image_tag }}

      - name: Deploy to dev
        run: |
          kustomize build k8s/overlays/dev/ | kubectl apply -f -
          kubectl rollout status deployment/${{ inputs.service }} -n clawbrowser-dev --timeout=120s

      - name: Commit updated overlay
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add k8s/overlays/dev/
          git diff --staged --quiet || git commit -m "deploy: update ${{ inputs.service }} dev image to ${{ inputs.image_tag }}"
          git push
```

- [ ] **Step 2: Create promote-prod workflow**

Create `.github/workflows/promote-prod.yaml`:

```yaml
name: Promote to Production

on:
  workflow_dispatch:
    inputs:
      service:
        description: "Service to promote"
        required: true
        type: choice
        options:
          - clawbrowser-api
          - clawbrowser-dashboard
      image_tag:
        description: "Docker image tag to promote (must be running in QA)"
        required: true
        type: string

permissions:
  id-token: write
  contents: write

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER: clawbrowser-eks

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name ${{ env.EKS_CLUSTER }} --region ${{ env.AWS_REGION }}

      - name: Verify image exists in Docker Hub
        run: |
          docker manifest inspect clawbrowser/${{ inputs.service }}:${{ inputs.image_tag }} > /dev/null 2>&1 || {
            echo "Error: image clawbrowser/${{ inputs.service }}:${{ inputs.image_tag }} not found in Docker Hub"
            exit 1
          }

      - name: Verify image is running in QA
        run: |
          QA_IMAGE=$(kubectl get deployment ${{ inputs.service }} -n clawbrowser-qa -o jsonpath='{.spec.template.spec.containers[0].image}')
          EXPECTED="clawbrowser/${{ inputs.service }}:${{ inputs.image_tag }}"
          if [ "$QA_IMAGE" != "$EXPECTED" ]; then
            echo "Error: QA is running ${QA_IMAGE}, not ${EXPECTED}"
            exit 1
          fi

      - name: Update prod overlay image tag
        run: |
          cd k8s/overlays/prod
          kustomize edit set image clawbrowser/${{ inputs.service }}=clawbrowser/${{ inputs.service }}:${{ inputs.image_tag }}

      - name: Deploy to prod
        run: |
          kustomize build k8s/overlays/prod/ | kubectl apply -f -
          kubectl rollout status deployment/${{ inputs.service }} -n clawbrowser-prod --timeout=180s

      - name: Commit updated overlay
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add k8s/overlays/prod/
          git diff --staged --quiet || git commit -m "deploy: promote ${{ inputs.service }} to prod at ${{ inputs.image_tag }}"
          git push
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy-dev.yaml .github/workflows/promote-prod.yaml
git commit -m "feat: add manual deploy-dev and promote-prod GitHub Actions workflows"
```

---

### Task 22: GitHub Actions — Terraform Pipeline

**Files:**
- Create: `.github/workflows/terraform-apply.yaml`

- [ ] **Step 1: Create Terraform plan-on-PR, apply-on-merge workflow**

Create `.github/workflows/terraform-apply.yaml`:

```yaml
name: Terraform

on:
  pull_request:
    paths:
      - 'terraform/**'
  push:
    branches:
      - main
    paths:
      - 'terraform/**'

permissions:
  id-token: write
  contents: read
  pull-requests: write

env:
  AWS_REGION: us-east-1
  TF_DIR: terraform

jobs:
  plan:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.5"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Terraform Init
        run: terraform init
        working-directory: ${{ env.TF_DIR }}

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color -out=tfplan
        working-directory: ${{ env.TF_DIR }}

      - name: Comment plan on PR
        uses: actions/github-script@v7
        with:
          script: |
            const plan = `${{ steps.plan.outputs.stdout }}`;
            const truncated = plan.length > 60000 ? plan.substring(0, 60000) + '\n\n... (truncated)' : plan;
            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body: `## Terraform Plan\n\`\`\`\n${truncated}\n\`\`\``
            });

  apply:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: "1.5"

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Terraform Init
        run: terraform init
        working-directory: ${{ env.TF_DIR }}

      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: ${{ env.TF_DIR }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/terraform-apply.yaml
git commit -m "feat: add Terraform plan-on-PR and apply-on-merge GitHub Actions workflow"
```

---

### Task 23: GitHub Actions — Secret Scan Workflow

**Files:**
- Create: `.github/workflows/secret-scan.yaml`

- [ ] **Step 1: Create secret scanning CI workflow**

Create `.github/workflows/secret-scan.yaml`:

```yaml
name: Secret Scan

on:
  pull_request:
    branches:
      - main

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Install detect-secrets
        run: pip install detect-secrets

      - name: Run detect-secrets
        run: |
          detect-secrets scan --baseline .secrets.baseline
          detect-secrets audit --report --baseline .secrets.baseline

      - name: Check sealed-secrets files
        run: ./scripts/check-sealed-only.sh

      - name: Check for forbidden file types
        run: |
          FORBIDDEN=$(git diff --name-only --diff-filter=A origin/main...HEAD | grep -E '\.(env|pem|key)$' || true)
          if [ -n "$FORBIDDEN" ]; then
            echo "ERROR: Forbidden files detected:"
            echo "$FORBIDDEN"
            exit 1
          fi
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/secret-scan.yaml
git commit -m "feat: add secret scanning workflow for PRs"
```

---

### Task 24: Pre-Commit Hooks + Secrets Baseline

**Files:**
- Create: `.pre-commit-config.yaml`
- Create: `.secrets.baseline`

- [ ] **Step 1: Create pre-commit config**

Create `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/Yelp/detect-secrets
    rev: v1.4.0
    hooks:
      - id: detect-secrets
        args: ['--baseline', '.secrets.baseline']

  - repo: local
    hooks:
      - id: check-sealed-only
        name: Check sealed-secrets contain only SealedSecret kind
        entry: ./scripts/check-sealed-only.sh
        language: script
        files: 'sealed-secrets/.*\.yaml$'

      - id: block-env-files
        name: Block .env files from being committed
        entry: bash -c 'echo "ERROR: .env files must not be committed" && exit 1'
        language: system
        files: '\.env(\..+)?$'

      - id: block-private-keys
        name: Block private key files from being committed
        entry: bash -c 'echo "ERROR: Private key files must not be committed" && exit 1'
        language: system
        files: '\.(pem|key)$'
```

- [ ] **Step 2: Create secrets baseline**

Create `.secrets.baseline`:

```json
{
  "version": "1.4.0",
  "plugins_used": [
    {"name": "AWSKeyDetector"},
    {"name": "BasicAuthDetector"},
    {"name": "HighEntropyString", "limit": 4.5},
    {"name": "KeywordDetector", "keyword_exclude": ""},
    {"name": "PrivateKeyDetector"}
  ],
  "filters_used": [
    {"path": "detect_secrets.filters.allowlist.is_line_allowlisted"},
    {"path": "detect_secrets.filters.common.is_baseline_file", "filename": ".secrets.baseline"},
    {"path": "detect_secrets.filters.heuristic.is_likely_id_string"}
  ],
  "results": {},
  "generated_at": "2026-03-24T00:00:00Z"
}
```

- [ ] **Step 3: Commit**

```bash
git add .pre-commit-config.yaml .secrets.baseline
git commit -m "feat: add pre-commit hooks for secret scanning and file type guards"
```

---

### Task 25: Final Validation

- [ ] **Step 1: Validate all Terraform files**

```bash
cd terraform && terraform init -backend=false && terraform validate
```

Expected: `Success! The configuration is valid.`

- [ ] **Step 2: Validate all Kustomize overlays**

```bash
kustomize build k8s/cluster-wide/
kustomize build k8s/overlays/dev/
kustomize build k8s/overlays/qa/
kustomize build k8s/overlays/prod/
```

Expected: Valid YAML output for each.

- [ ] **Step 3: Validate shell scripts**

```bash
shellcheck scripts/*.sh
```

Expected: No errors.

- [ ] **Step 4: Validate YAML syntax (optional)**

```bash
yamllint k8s/ || true
```

Expected: No critical errors (warnings about line length are acceptable).

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git diff --staged --quiet || git commit -m "fix: address validation issues"
```
