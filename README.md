# Update your ECS Cluster And Service to use Fargate Spot capacity provider

## About

Htis task execute a custom resource to add Capacity provider to use Fargate Spot containers

## Installation

Install dependecies on NodeJs Lambda :  

```bash

cd lib/_fargateSpotService/
npm install

cd lib/_sendResponse/
npm install

```

### Use stack

```

  CustomResourceStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: stacks/fargateSpot.yml
      Parameters:
        ServiceName: !GetAtt MyEcsService.Name
        ClusterId: !Ref MyEcsCluster
        Base: 1
        Weight: 10
        
```