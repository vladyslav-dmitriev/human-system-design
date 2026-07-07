#!/usr/bin/env bash

set -euo pipefail

########################################
# Configuration
########################################

ARGOCD_VERSION="8.3.0"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo ""
echo "========================================"
echo " Human System Design Bootstrap"
echo "========================================"
echo ""

########################################
# Check dependencies
########################################

check_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "❌ $1 is not installed."
        exit 1
    fi
}

echo "Checking dependencies..."

check_command docker
check_command kubectl
check_command helm
check_command git
check_command minikube

echo "✅ Dependencies OK"

########################################
# Start Minikube
########################################

echo ""
echo "Starting Minikube..."

if ! minikube status >/dev/null 2>&1; then
    minikube start
else
    echo "Minikube already running."
fi

########################################
# Enable addons
########################################

echo ""
echo "Enabling addons..."

minikube addons enable ingress
minikube addons enable metrics-server

########################################
# Helm repositories
########################################

echo ""
echo "Adding Helm repositories..."

helm repo add bitnami https://charts.bitnami.com/bitnami || true

helm repo add prometheus-community \
https://prometheus-community.github.io/helm-charts || true

helm repo add grafana \
https://grafana.github.io/helm-charts || true

helm repo add ingress-nginx \
https://kubernetes.github.io/ingress-nginx || true

helm repo add jetstack \
https://charts.jetstack.io || true

helm repo add argo \
https://argoproj.github.io/argo-helm || true

# helm repo add sealed-secrets \
# https://bitnami-labs.github.io/sealed-secrets || true

helm repo update

########################################
# Install ArgoCD
########################################

echo ""
echo "Installing ArgoCD..."

helm upgrade --install argocd \
argo/argo-cd \
--namespace argocd \
--create-namespace

########################################
# Install Sealed Secrets
########################################

# echo ""
# echo "Installing Sealed Secrets..."

# helm upgrade --install sealed-secrets \
# sealed-secrets/sealed-secrets \
# --namespace kube-system

########################################
# Wait for ArgoCD
########################################

echo ""
echo "Waiting for ArgoCD..."

kubectl rollout status deployment/argocd-server \
-n argocd \
--timeout=300s

########################################
# Add Github Secrets to ArgoCD
########################################

# echo "Creating GitHub repository secret..."

# kubectl create secret generic human-system-design-repo \
#   --namespace argocd \
#   --from-literal=type=git \
#   --from-literal=url=https://github.com/vladyslav-dmitriev/human-system-design.git \
#   --from-literal=username=vladyslav-dmitriev \
#   --from-literal=password="$GITHUB_TOKEN" \
#   --dry-run=client -o yaml | kubectl apply -f -

########################################
# Wait for Sealed Secrets
########################################

# echo ""
# echo "Waiting for Sealed Secrets..."

# kubectl rollout status deployment/sealed-secrets \
# -n kube-system \
# --timeout=300s || true

########################################
# Apply GitOps bootstrap
########################################

echo ""
echo "Applying GitOps..."

kubectl apply -f \
"${PROJECT_ROOT}/infra/argocd/project.yaml"

kubectl apply -f \
"${PROJECT_ROOT}/infra/argocd/root-app.yaml"

########################################
# Print information
########################################

echo ""
echo "========================================"
echo "Bootstrap completed!"
echo "========================================"

echo ""

echo "Pods:"
kubectl get pods -A

echo ""

echo "Applications:"
kubectl get applications -n argocd || true

echo ""

echo "Namespaces:"
kubectl get ns

echo ""

echo "ArgoCD password:"

kubectl \
-n argocd \
get secret argocd-initial-admin-secret \
-o jsonpath="{.data.password}" \
| base64 --decode

echo ""
echo ""

echo "Port forward:"
echo ""

echo "kubectl port-forward svc/argocd-server -n argocd 8080:443"

echo ""

echo "Open:"
echo ""

echo "https://localhost:8080"

echo ""

echo "username: admin"

echo ""