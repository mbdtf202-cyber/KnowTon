# KnowTon 基础设施与部署文档

## Kubernetes 集群架构

### 集群配置

```yaml
# 生产环境集群规格
Cluster:
  Provider: AWS EKS / GCP GKE / Azure AKS
  Kubernetes Version: 1.28+
  Node Pools:
    - name: general-purpose
      instance_type: t3.xlarge (4 vCPU, 16GB RAM)
      min_nodes: 3
      max_nodes: 10
      auto_scaling: enabled
      
    - name: compute-optimized
      instance_type: c6i.2xlarge (8 vCPU, 16GB RAM)
      min_nodes: 2
      max_nodes: 8
      workloads: [asset-tokenization, bonding-service]
      
    - name: memory-optimized
      instance_type: r6i.2xlarge (8 vCPU, 64GB RAM)
      min_nodes: 2
      max_nodes: 6
      workloads: [analytics-service, clickhouse]
      
    - name: gpu-nodes
      instance_type: g5.xlarge (4 vCPU, 16GB RAM, 1x NVIDIA A10G)
      min_nodes: 1
      max_nodes: 4
      workloads: [ai-model-serving]
      taints:
        - key: nvidia.com/gpu
          value: "true"
          effect: NoSchedule
```

### 命名空间设计

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: knowton-prod
  labels:
    environment: production
---
apiVersion: v1
kind: Namespace
metadata:
  name: knowton-staging
  labels:
    environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: knowton-monitoring
  labels:
    purpose: observability
---
apiVersion: v1
kind: Namespace
metadata:
  name: knowton-data
  labels:
    purpose: data-layer
```

## 完整微服务部署配置

### API Gateway (Kong)

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kong-config
  namespace: knowton-prod
data:
  kong.yml: |
    _format_version: "3.0"
    services:
      - name: creator-service
        url: http://creator-service.knowton-prod.svc.cluster.local
        routes:
          - name: creator-routes
            paths:
              - /api/v1/creators
              - /api/v1/content
        plugins:
          - name: rate-limiting
            config:
              minute: 100
              policy: local
          - name: jwt
            config:
              secret_is_base64: false
          - name: cors
            config:
              origins:
                - https://knowton.io
              methods:
                - GET
                - POST
                - PUT
                - DELETE
              
      - name: marketplace-service
        url: http://marketplace-service.knowton-prod.svc.cluster.local
        routes:
          - name: marketplace-routes
            paths:
              - /api/v1/marketplace
              - /api/v1/orders
        plugins:
          - name: rate-limiting
            config:
              minute: 200
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kong-gateway
  namespace: knowton-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kong-gateway
  template:
    metadata:
      labels:
        app: kong-gateway
    spec:
      containers:
      - name: kong
        image: kong:3.4
        ports:
        - containerPort: 8000
          name: proxy
        - containerPort: 8001
          name: admin
        env:
        - name: KONG_DATABASE
          value: "postgres"
        - name: KONG_PG_HOST
          value: "postgres-service"
        - name: KONG_PROXY_ACCESS_LOG
          value: "/dev/stdout"
        - name: KONG_ADMIN_ACCESS_LOG
          value: "/dev/stdout"
        - name: KONG_PROXY_ERROR_LOG
          value: "/dev/stderr"
        - name: KONG_ADMIN_ERROR_LOG
          value: "/dev/stderr"
        volumeMounts:
        - name: kong-config
          mountPath: /etc/kong
      volumes:
      - name: kong-config
        configMap:
          name: kong-config
---
apiVersion: v1
kind: Service
metadata:
  name: kong-gateway
  namespace: knowton-prod
spec:
  type: LoadBalancer
  selector:
    app: kong-gateway
  ports:
  - name: proxy
    port: 80
    targetPort: 8000
  - name: proxy-ssl
    port: 443
    targetPort: 8443
```

### Kafka 集群部署

```yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: knowton-kafka
  namespace: knowton-data
spec:
  kafka:
    version: 3.6.0
    replicas: 3
    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
      inter.broker.protocol.version: "3.6"
      log.retention.hours: 168
      log.segment.bytes: 1073741824
      compression.type: snappy
    storage:
      type: jbod
      volumes:
      - id: 0
        type: persistent-claim
        size: 500Gi
        class: fast-ssd
        deleteClaim: false
    resources:
      requests:
        memory: 8Gi
        cpu: 2000m
      limits:
        memory: 16Gi
        cpu: 4000m
  zookeeper:
    replicas: 3
    storage:
      type: persistent-claim
      size: 100Gi
      class: fast-ssd
      deleteClaim: false
    resources:
      requests:
        memory: 2Gi
        cpu: 500m
      limits:
        memory: 4Gi
        cpu: 1000m
  entityOperator:
    topicOperator: {}
    userOperator: {}
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: nft-minted
  namespace: knowton-data
  labels:
    strimzi.io/cluster: knowton-kafka
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000  # 7 days
    segment.bytes: 1073741824
    compression.type: snappy
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: trades
  namespace: knowton-data
  labels:
    strimzi.io/cluster: knowton-kafka
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 2592000000  # 30 days
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: royalty-distributions
  namespace: knowton-data
  labels:
    strimzi.io/cluster: knowton-kafka
spec:
  partitions: 6
  replicas: 3
```

### PostgreSQL 高可用部署

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: knowton-postgres
  namespace: knowton-data
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16
  
  postgresql:
    parameters:
      max_connections: "500"
      shared_buffers: "4GB"
      effective_cache_size: "12GB"
      maintenance_work_mem: "1GB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      work_mem: "10MB"
      min_wal_size: "1GB"
      max_wal_size: "4GB"
  
  bootstrap:
    initdb:
      database: knowton
      owner: knowton_user
      secret:
        name: postgres-credentials
  
  storage:
    size: 500Gi
    storageClass: fast-ssd
  
  backup:
    barmanObjectStore:
      destinationPath: s3://knowton-backups/postgres
      s3Credentials:
        accessKeyId:
          name: aws-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: aws-credentials
          key: SECRET_ACCESS_KEY
      wal:
        compression: gzip
        maxParallel: 8
    retentionPolicy: "30d"
  
  monitoring:
    enablePodMonitor: true
  
  resources:
    requests:
      memory: "8Gi"
      cpu: "2000m"
    limits:
      memory: "16Gi"
      cpu: "4000m"
```

### ClickHouse 分析数据库

```yaml
apiVersion: clickhouse.altinity.com/v1
kind: ClickHouseInstallation
metadata:
  name: knowton-clickhouse
  namespace: knowton-data
spec:
  configuration:
    clusters:
      - name: knowton-cluster
        layout:
          shardsCount: 3
          replicasCount: 2
    zookeeper:
      nodes:
        - host: zookeeper-0.zookeeper-headless
        - host: zookeeper-1.zookeeper-headless
        - host: zookeeper-2.zookeeper-headless
    users:
      knowton_user/password: knowton_password
      knowton_user/networks/ip:
        - "::/0"
    profiles:
      default/max_memory_usage: 10000000000
      default/max_execution_time: 300
  defaults:
    templates:
      podTemplate: clickhouse-pod
      dataVolumeClaimTemplate: data-volume
      logVolumeClaimTemplate: log-volume
  templates:
    podTemplates:
      - name: clickhouse-pod
        spec:
          containers:
            - name: clickhouse
              image: clickhouse/clickhouse-server:23.8
              resources:
                requests:
                  memory: "16Gi"
                  cpu: "4000m"
                limits:
                  memory: "32Gi"
                  cpu: "8000m"
    volumeClaimTemplates:
      - name: data-volume
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 1Ti
          storageClassName: fast-ssd
      - name: log-volume
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
```

### Redis 集群

```yaml
apiVersion: redis.redis.opstreelabs.in/v1beta1
kind: RedisCluster
metadata:
  name: knowton-redis
  namespace: knowton-data
spec:
  clusterSize: 6
  kubernetesConfig:
    image: redis:7.2-alpine
    imagePullPolicy: IfNotPresent
    resources:
      requests:
        cpu: 500m
        memory: 2Gi
      limits:
        cpu: 1000m
        memory: 4Gi
  redisExporter:
    enabled: true
    image: oliver006/redis_exporter:latest
  storage:
    volumeClaimTemplate:
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 100Gi
        storageClassName: fast-ssd
  securityContext:
    runAsUser: 1000
    fsGroup: 1000
```

## AI 模型服务部署

### TorchServe 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: torchserve-inference
  namespace: knowton-prod
spec:
  replicas: 2
  selector:
    matchLabels:
      app: torchserve
  template:
    metadata:
      labels:
        app: torchserve
    spec:
      nodeSelector:
        nvidia.com/gpu: "true"
      tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
      containers:
      - name: torchserve
        image: pytorch/torchserve:latest-gpu
        ports:
        - containerPort: 8080
          name: inference
        - containerPort: 8081
          name: management
        - containerPort: 8082
          name: metrics
        env:
        - name: TS_NUMBER_OF_GPU
          value: "1"
        - name: TS_MAX_REQUEST_SIZE
          value: "104857600"  # 100MB
        - name: TS_MAX_RESPONSE_SIZE
          value: "104857600"
        resources:
          requests:
            nvidia.com/gpu: 1
            memory: "8Gi"
            cpu: "2000m"
          limits:
            nvidia.com/gpu: 1
            memory: "16Gi"
            cpu: "4000m"
        volumeMounts:
        - name: model-store
          mountPath: /home/model-server/model-store
        - name: config
          mountPath: /home/model-server/config
      volumes:
      - name: model-store
        persistentVolumeClaim:
          claimName: torchserve-models
      - name: config
        configMap:
          name: torchserve-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: torchserve-config
  namespace: knowton-prod
data:
  config.properties: |
    inference_address=http://0.0.0.0:8080
    management_address=http://0.0.0.0:8081
    metrics_address=http://0.0.0.0:8082
    number_of_netty_threads=32
    job_queue_size=1000
    model_store=/home/model-server/model-store
    load_models=all
```

### Vector Database (Weaviate)

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: weaviate
  namespace: knowton-prod
spec:
  serviceName: weaviate
  replicas: 3
  selector:
    matchLabels:
      app: weaviate
  template:
    metadata:
      labels:
        app: weaviate
    spec:
      containers:
      - name: weaviate
        image: semitechnologies/weaviate:1.22.4
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: QUERY_DEFAULTS_LIMIT
          value: "25"
        - name: AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED
          value: "false"
        - name: PERSISTENCE_DATA_PATH
          value: "/var/lib/weaviate"
        - name: DEFAULT_VECTORIZER_MODULE
          value: "text2vec-openai"
        - name: ENABLE_MODULES
          value: "text2vec-openai,generative-openai"
        - name: CLUSTER_HOSTNAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
        volumeMounts:
        - name: weaviate-data
          mountPath: /var/lib/weaviate
  volumeClaimTemplates:
  - metadata:
      name: weaviate-data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: fast-ssd
      resources:
        requests:
          storage: 500Gi
```

## 监控与可观测性

### Prometheus 配置

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: knowton-monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s
    
    scrape_configs:
      - job_name: 'kubernetes-pods'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
            action: keep
            regex: true
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
            action: replace
            target_label: __metrics_path__
            regex: (.+)
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:$2
            target_label: __address__
      
      - job_name: 'kafka'
        static_configs:
          - targets: ['knowton-kafka-kafka-brokers:9404']
      
      - job_name: 'postgres'
        static_configs:
          - targets: ['knowton-postgres-metrics:9187']
      
      - job_name: 'redis'
        static_configs:
          - targets: ['knowton-redis-exporter:9121']
      
      - job_name: 'clickhouse'
        static_configs:
          - targets: ['knowton-clickhouse-0:9363']
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: knowton-monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:v2.48.0
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus'
          - '--storage.tsdb.retention.time=30d'
          - '--web.enable-lifecycle'
        ports:
        - containerPort: 9090
        resources:
          requests:
            memory: "4Gi"
            cpu: "1000m"
          limits:
            memory: "8Gi"
            cpu: "2000m"
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-storage
```

### Grafana 仪表板

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: knowton-monitoring
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
        image: grafana/grafana:10.2.0
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: grafana-credentials
              key: admin-password
        - name: GF_INSTALL_PLUGINS
          value: "grafana-piechart-panel,grafana-worldmap-panel"
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        volumeMounts:
        - name: grafana-storage
          mountPath: /var/lib/grafana
        - name: grafana-datasources
          mountPath: /etc/grafana/provisioning/datasources
        - name: grafana-dashboards
          mountPath: /etc/grafana/provisioning/dashboards
      volumes:
      - name: grafana-storage
        persistentVolumeClaim:
          claimName: grafana-storage
      - name: grafana-datasources
        configMap:
          name: grafana-datasources
      - name: grafana-dashboards
        configMap:
          name: grafana-dashboards
```

## CI/CD 流程

### GitHub Actions Workflow

```yaml
name: Build and Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run tests
        run: npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  build:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      
      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
  
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name knowton-prod --region us-east-1
      
      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/creator-service \
            creator-service=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            -n knowton-prod
          kubectl rollout status deployment/creator-service -n knowton-prod
```

### ArgoCD Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: knowton-platform
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/knowton/platform
    targetRevision: HEAD
    path: k8s/overlays/production
    kustomize:
      images:
        - knowton/creator-service:latest
        - knowton/asset-tokenization:latest
        - knowton/marketplace-service:latest
  destination:
    server: https://kubernetes.default.svc
    namespace: knowton-prod
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
      allowEmpty: false
    syncOptions:
      - CreateNamespace=true
    retry:
      limit: 5
      backoff:
        duration: 5s
        factor: 2
        maxDuration: 3m
```

## 安全配置

### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: knowton-prod
spec:
  podSelector: {}
  policyTypes:
  - Ingress
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-api-gateway
  namespace: knowton-prod
spec:
  podSelector:
    matchLabels:
      tier: backend
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: kong-gateway
    ports:
    - protocol: TCP
      port: 3000
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-database-access
  namespace: knowton-data
spec:
  podSelector:
    matchLabels:
      app: postgres
  policyTypes:
  - Ingress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: knowton-prod
    ports:
    - protocol: TCP
      port: 5432
```

### Pod Security Standards

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: knowton-prod
  labels:
    pod-security.kubernetes.io/enforce: restricted
    pod-security.kubernetes.io/audit: restricted
    pod-security.kubernetes.io/warn: restricted
```

这个基础设施文档提供了完整的 Kubernetes 部署配置，包括所有微服务、数据库、消息队列、AI 服务和监控系统！
