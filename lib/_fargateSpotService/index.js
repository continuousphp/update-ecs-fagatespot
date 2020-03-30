const AWS = require('aws-sdk');

exports.handler = async (event, context) => {
    const ServiceName = event.ResourceProperties.ServiceName;
    const ClusterName = event.ResourceProperties.ClusterName;
    const minCapacity = event.ResourceProperties.MinCapacity;
    const maxCapacity = event.ResourceProperties.MaxCapacity;
    try {
        const ecs = new AWS.ECS();
        let service, cluster, serviceParams , clusterParams , out;
        console.info(`ECS Service ${ServiceName} ${event.RequestType}`);
        serviceParams = {
            "service": ServiceName,
            "cluster": ClusterName, 
            "forceNewDeployment": true, 
            "capacityProviderStrategy": [ 
                { 
                    "base": minCapacity,
                    "capacityProvider": "FARGATE_SPOT",
                    "weight": maxCapacity
                },
                { 
                    "base": 0,
                    "capacityProvider": "FARGATE",
                    "weight": minCapacity
                }
            ]
        };
        
        clusterParams = {
            "cluster": ClusterName,
            "capacityProviders": [ "FARGATE_SPOT" , "FARGATE" ],
            "defaultCapacityProviderStrategy": [ 
                { 
                    "base": minCapacity,
                    "capacityProvider": "FARGATE_SPOT",
                    "weight": maxCapacity
                },
                { 
                    "base": 0,
                    "capacityProvider": "FARGATE",
                    "weight": 0
                }
            ]
        };
        
        switch (event.RequestType) {
            case 'Update':
            case 'Create':
                cluster = await ecs.putClusterCapacityProviders(clusterParams).promise();
                service = await ecs.updateService(serviceParams).promise();
                out = {"serviceArn": service.service.serviceArn , "clusterArn": cluster.cluster.clusterArn}
                await sendCloudFormationResponse(event, ServiceName, 'SUCCESS', out);
                console.info(`Service ECS Provider Success for request type ${event.RequestType}`);
            break;

            case 'Delete':
                clusterParams = {
                    "cluster": ClusterName,
                    "capacityProviders": [],
                    "defaultCapacityProviderStrategy": []
                };
                
                serviceParams = {
                    "service": ServiceName,
                    "cluster": ClusterName, 
                    "forceNewDeployment": true, 
                    "capacityProviderStrategy": []
                };
                
                cluster = await ecs.putClusterCapacityProviders(clusterParams).promise();
                service = await ecs.updateService(serviceParams).promise();
                out = {"serviceArn": service.service.serviceArn , "clusterArn": cluster.cluster.clusterArn}
                await sendCloudFormationResponse(event, ServiceName, 'SUCCESS', out);
                console.info(`Service ECS Provider Success for request type ${event.RequestType}`);
            break;

            default:
                throw new Error(`unsupported request type ${event.RequestType}`);
        }

    } catch (error) {
        console.error(`Service ECS Provider Error for request type ${event.RequestType}:`, error);
        await sendCloudFormationResponse(event, ServiceName , 'FAILED');
    }
};

async function sendCloudFormationResponse(event, PhysicalResourceId, responseStatus, responseData) {
    const params = {
        FunctionName: process.env.Callback,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
            StackId: event.StackId,
            RequestId: event.RequestId,
            LogicalResourceId: event.LogicalResourceId,
            PhysicalResourceId: PhysicalResourceId,
            ResponseURL: event.ResponseURL,
            ResponseStatus: responseStatus,
            ResponseData: responseData
        })
    };

    const lambda = new AWS.Lambda();
    const response = await lambda.invoke(params).promise();

    if (response.FunctionError) {
        const responseError = JSON.parse(response.Payload);
        throw new Error(responseError.errorMessage);
    }
} 