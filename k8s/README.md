# Medusa Kubernetes Deployment Guide

This folder contains production-ready Kubernetes manifests for Medusa (Next.js) and Redis, plus cloud ingress overlays and a GitHub Actions deployment pipeline.

## What is deployed

- Namespace: medusa
- Base kustomization: k8s/base (shared resources)
- App Deployment: medusa-app (rolling update, anti-affinity, probes, HPA, PDB)
- App Service: medusa-app (ClusterIP, 80 -> 3000)
- Redis Deployment: medusa-redis (persistent AOF on PVC)
- Redis Service: medusa-redis (internal ClusterIP)
- Ingress: medusa-app
- NetworkPolicies: Redis ingress restricted to app, app egress constrained

## Manifest layout

- k8s/kustomization.yaml: root entrypoint for local/default apply
- k8s/base/: base Kubernetes resources used by all overlays
- k8s/overlays/eks: AWS ALB ingress annotations and class
- k8s/overlays/gke: GKE ingress + ManagedCertificate
- k8s/overlays/aks: Azure Application Gateway ingress annotations
- scripts/configure-k8s-ingress.ps1: helper script to patch domain and TLS refs

## Ingress overlays

- Base (local or ingress-nginx): k8s
- EKS (ALB): k8s/overlays/eks
- GKE (GCE + ManagedCertificate): k8s/overlays/gke
- AKS (Application Gateway): k8s/overlays/aks

## Decide later flow

If you want to defer cloud/domain finalization, keep placeholders and only enable deploy automation when ready.

When ready, run the helper script:

```powershell
pwsh ./scripts/configure-k8s-ingress.ps1 -Cloud eks -Domain files.yourdomain.com -TlsRef arn:aws:acm:REGION:ACCOUNT:certificate/CERTID
pwsh ./scripts/configure-k8s-ingress.ps1 -Cloud gke -Domain files.yourdomain.com -TlsRef your-gke-static-ip-name
pwsh ./scripts/configure-k8s-ingress.ps1 -Cloud aks -Domain files.yourdomain.com -TlsRef your-appgw-cert-name
```

Then validate:

```bash
kubectl kustomize k8s
kubectl kustomize k8s/overlays/<eks|gke|aks>
```

## 1) Set domain and TLS

Replace medusa.example.com with your real FQDN in:

- k8s/ingress.yaml
- k8s/overlays/eks/patch-ingress.yaml
- k8s/overlays/gke/patch-ingress.yaml
- k8s/overlays/gke/managed-certificate.yaml
- k8s/overlays/aks/patch-ingress.yaml

If you use base ingress-nginx with TLS secret:

```bash
kubectl -n medusa create secret tls medusa-tls --cert=/path/to/tls.crt --key=/path/to/tls.key
```

For EKS ALB, set the ACM ARN in k8s/overlays/eks/patch-ingress.yaml.
For GKE, create and reserve a static IP and update kubernetes.io/ingress.global-static-ip-name.
For AKS AGIC, set appgw.ingress.kubernetes.io/appgw-ssl-certificate.

## 2) Prepare app secrets

```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
```

Fill all values in k8s/secrets.yaml.

For local Docker Desktop runs, you can also create/update the secret directly from your `.env.local`:

```bash
kubectl -n medusa create secret generic medusa-secrets --from-env-file=.env.local --dry-run=client -o yaml | kubectl apply -f -
```

Important: env keys must not contain trailing spaces and must match Kubernetes key format (`[A-Za-z_][A-Za-z0-9_]*`).

## 3) Deploy on Docker Desktop Kubernetes

```bash
kubectl config use-context docker-desktop
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -k k8s
```

If your app image is not available in Docker Hub yet, build locally and let Kubernetes use your local image cache:

```bash
docker build -t mddawoodrahman/medusa:latest .
kubectl -n medusa patch deploy medusa-app --type='json' -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"IfNotPresent"}]'
kubectl -n medusa rollout restart deploy/medusa-app
```

Install ingress-nginx if needed:

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml
```

## 4) Deploy on Minikube

```bash
minikube start
minikube addons enable ingress
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -k k8s
```

Optional local access:

```bash
kubectl -n medusa port-forward svc/medusa-app 3000:80
```

## 5) Deploy on AWS EKS (ALB overlay)

```bash
aws eks update-kubeconfig --name <cluster-name> --region <region>
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -k k8s/overlays/eks
```

## 6) Deploy on GKE (GCE overlay)

```bash
gcloud container clusters get-credentials <cluster-name> --zone <zone> --project <project-id>
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -k k8s/overlays/gke
```

## 7) Deploy on Azure AKS (AGIC overlay)

```bash
az aks get-credentials --resource-group <resource-group> --name <aks-name>
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -k k8s/overlays/aks
```

## 8) Production GitHub Actions automation

Workflow file:

- .github/workflows/build-push-deploy-k8s.yml

What it does:

- Builds and pushes image tags:
  - mddawoodrahman/medusa:<git-sha-12>
  - mddawoodrahman/medusa:latest
- Authenticates to EKS or GKE or AKS
- Applies medusa namespace and runtime secret
- Applies matching overlay kustomization
- Updates deployment image to the new SHA tag
- Waits for rollout completion

### Required repository secrets

Docker Hub:

- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN

Application secrets:

- NEXT_PUBLIC_APPWRITE_ENDPOINT
- NEXT_PUBLIC_APPWRITE_PROJECT
- NEXT_PUBLIC_APPWRITE_DATABASE
- NEXT_PUBLIC_APPWRITE_USERS_COLLECTION
- NEXT_PUBLIC_APPWRITE_FILES_COLLECTION
- NEXT_PUBLIC_APPWRITE_FILE_SHARES_COLLECTION
- NEXT_PUBLIC_APPWRITE_BUCKET
- NEXT_APPWRITE_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_APP_URL
- APP_BASE_URL
- STARTUP_HEALTH_TOKEN

EKS secrets:

- AWS_ROLE_TO_ASSUME
- AWS_REGION
- EKS_CLUSTER_NAME

GKE secrets:

- GCP_WORKLOAD_IDENTITY_PROVIDER
- GCP_SERVICE_ACCOUNT
- GCP_PROJECT_ID
- GKE_CLUSTER_NAME
- GKE_LOCATION

AKS secrets:

- AZURE_CLIENT_ID
- AZURE_TENANT_ID
- AZURE_SUBSCRIPTION_ID
- AKS_RESOURCE_GROUP
- AKS_CLUSTER_NAME

Workflow behavior:

- Push to main: builds and pushes image; deploy runs only when repository variable ENABLE_K8S_DEPLOY is true
- Manual dispatch: choose cloud (eks, gke, aks) and deploy true/false

Recommended repository variables:

- ENABLE_K8S_DEPLOY=false (default while undecided)
- K8S_CLOUD=eks (or gke or aks when ready)

## 9) Scaling commands

```bash
kubectl -n medusa scale deploy/medusa-app --replicas=4
kubectl -n medusa get hpa medusa-app -w
```

## 10) Logs commands

```bash
kubectl -n medusa logs deploy/medusa-app -f --tail=200
kubectl -n medusa logs deploy/medusa-redis -f --tail=200
```

## 11) Debugging commands

```bash
kubectl -n medusa describe deploy medusa-app
kubectl -n medusa describe deploy medusa-redis
kubectl -n medusa get events --sort-by=.metadata.creationTimestamp
kubectl -n medusa run curl --rm -it --restart=Never --image=curlimages/curl:8.7.1 -- curl -sS http://medusa-app/api/health/startup
kubectl -n medusa run net-debug --rm -it --restart=Never --image=busybox:1.36 -- sh -c 'nslookup medusa-redis && nc -zvw3 medusa-redis 6379'
```

## 12) Rollback commands

```bash
kubectl -n medusa rollout history deploy/medusa-app
kubectl -n medusa rollout undo deploy/medusa-app
kubectl -n medusa rollout undo deploy/medusa-app --to-revision=<revision>
```

## 13) Update image version commands

```bash
kubectl -n medusa set image deploy/medusa-app medusa=mddawoodrahman/medusa:<new-tag>
kubectl -n medusa rollout status deploy/medusa-app
```

## 14) Quick post-deploy checks

```bash
kubectl -n medusa get pods
kubectl -n medusa get svc
kubectl -n medusa get ingress
kubectl -n medusa get endpoints medusa-app
kubectl -n medusa get endpoints medusa-redis
```
