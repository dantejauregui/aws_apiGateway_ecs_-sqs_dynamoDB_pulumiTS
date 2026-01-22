import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface EcsClusterComponentArgs {
    vpcId: pulumi.Input<string>;                // for future services (SGs, endpoints, etc.)
    privateSubnetIds: pulumi.Input<string[]>;   // for future ECS services
    clusterName?: pulumi.Input<string>;
    enableContainerInsights?: boolean;
}

export class EcsClusterComponent extends pulumi.ComponentResource {
    public readonly cluster: aws.ecs.Cluster;
    public readonly clusterId: pulumi.Output<string>;
    public readonly clusterArn: pulumi.Output<string>;
    public readonly clusterName: pulumi.Output<string>;

    constructor(name: string, args: EcsClusterComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:ecs:Cluster", name, {}, opts);

        const effectiveClusterName = args.clusterName ?? "ECommerce";

        this.cluster = new aws.ecs.Cluster(`${name}-cluster`, {
            name: effectiveClusterName,
            settings: [{
                name: "containerInsights",
                value: args.enableContainerInsights !== false ? "enabled" : "disabled",
            }],
        }, { parent: this });

        this.clusterId = this.cluster.id;
        this.clusterArn = this.cluster.arn;
        this.clusterName = this.cluster.name;

        this.registerOutputs({
            clusterId: this.clusterId,
            clusterArn: this.clusterArn,
            clusterName: this.clusterName,
        });
    }
}
