# ECS Exec via CDK
Demonstrate ECS Fargate Exec configuration via CDK

This stack deploys a simple ECS Fargate cluster, with a single task. The container deployed uses the ECS Exec feature to become reachable via the SSM client.

To deploy, run:

```
$ cdk init     // Only the first time
$ cdk diff     // To check what is going to be deployed
$ cdk deploy   
```

Then, assuming that you have the AWS CLI and AWS SSM plugin installed, run this to connect to your container:

```
aws ecs execute-command --cluster <CLUSTER_ARN> --task <CONTAINER_ARN> --container SimpleContainer --interactive --command "/bin/sh"
```

