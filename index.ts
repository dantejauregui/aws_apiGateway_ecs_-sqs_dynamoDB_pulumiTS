import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { NetworkComponent } from "./network";
import { EcsClusterComponent } from "./cluster";

// Stack-wide transformation to inject Default Tags:
pulumi.runtime.registerStackTransformation((args) => {
    const props = args.props as any;

    // If the resource supports tags, merge in our default.
    // (Use a new object to avoid mutating shared references.)
    if (props && typeof props === "object" && "tags" in props) {
        return {
            props: {
                ...props,
                tags: {
                    ...(props.tags ?? {}),
                    CreatedBy: "Pulumi",
                },
            },
            opts: args.opts,
        };
    }

    return {
        props,
        opts: args.opts,
    };
});

// Example resource: S3 bucket
const bucket = new aws.s3.Bucket("my-bucket-1234567890-pulumi-demo-dantej", {});
export const bucketName = bucket.id;

// Network (ComponentResource)
const network = new NetworkComponent("ecommerce", {
    vpcCidr: "10.0.0.0/16",
    // You can tune these ARGs later; keeping your current CIDRs:
    publicSubnetCidrs: ["10.0.0.0/24", "10.0.1.0/24"],
    privateSubnetCidrs: ["10.0.128.0/24", "10.0.129.0/24"],
});

// ECS Cluster (ComponentResource)
const ecsCluster = new EcsClusterComponent("ecommerce", {
    vpcId: network.vpcId,
    privateSubnetIds: network.privateSubnetIds,
    clusterName: "ECommerce",
    enableContainerInsights: true,
});

// ECS Cluster "exports" DATA as OUTPUTS using ES6 Modules (Modern way):
export const clusterArn = ecsCluster.clusterArn;
export const clusterName = ecsCluster.clusterName;

// Network "exports" DATA as OUTPUTS using ES6 Modules (Modern way):
export const vpcId = network.vpcId;
export const publicSubnetIds = network.publicSubnetIds;
export const privateSubnetIds = network.privateSubnetIds;
