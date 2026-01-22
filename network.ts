import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface NetworkComponentArgs {
    vpcCidr: pulumi.Input<string>;
    publicSubnetCidrs: [pulumi.Input<string>, pulumi.Input<string>];
    privateSubnetCidrs: [pulumi.Input<string>, pulumi.Input<string>];
}

export class NetworkComponent extends pulumi.ComponentResource {
    public readonly vpcId: pulumi.Output<string>;
    public readonly publicSubnetIds: pulumi.Output<string[]>;
    public readonly privateSubnetIds: pulumi.Output<string[]>;

    constructor(name: string, args: NetworkComponentArgs, opts?: pulumi.ComponentResourceOptions) {
        super("custom:network:Network", name, {}, opts);

        // VPC (se usa CONST para q se llame en los otros recursos AWS):
        const vpc = new aws.ec2.Vpc(`${name}-vpc`, {
            cidrBlock: args.vpcCidr,
            enableDnsHostnames: true,
            enableDnsSupport: true,
        }, { parent: this });

        // Internet Gateway
        const igw = new aws.ec2.InternetGateway(`${name}-igw`, {
            vpcId: vpc.id,
        }, { parent: this });

        // Fetches available AZs from AWS. This is a "Output Version" Data Source (read-only query), is NOT a resource creation, INSTEAD returns only Data as Output. (And this doesn't make the API call immediately using "async/await", insted later uses  " .apply()" to access  Data Values later):
        const azs = aws.getAvailabilityZonesOutput({ state: "available" });

        // Public Subnets (2)
        const publicSubnet1 = new aws.ec2.Subnet(`${name}-public-subnet-1`, {
            vpcId: vpc.id,
            cidrBlock: args.publicSubnetCidrs[0],
            // As mentioned before, we use .apply() to Access Values from aws.getAvailabilityZonesOutput (due to returns an Output):
            availabilityZone: azs.names.apply((names) => names[0]),
            mapPublicIpOnLaunch: true,
        }, { parent: this });

        const publicSubnet2 = new aws.ec2.Subnet(`${name}-public-subnet-2`, {
            vpcId: vpc.id,
            cidrBlock: args.publicSubnetCidrs[1],
            availabilityZone: azs.names.apply((names) => names[1]),
            mapPublicIpOnLaunch: true,
        }, { parent: this });

        // Private Subnets (2)
        const privateSubnet1 = new aws.ec2.Subnet(`${name}-private-subnet-1`, {
            vpcId: vpc.id,
            cidrBlock: args.privateSubnetCidrs[0],
            availabilityZone: azs.names.apply((names) => names[0]),
        }, { parent: this });

        const privateSubnet2 = new aws.ec2.Subnet(`${name}-private-subnet-2`, {
            vpcId: vpc.id,
            cidrBlock: args.privateSubnetCidrs[1],
            availabilityZone: azs.names.apply((names) => names[1]),
        }, { parent: this });

        // Elastic IPs for NAT Gateways
        const eip1 = new aws.ec2.Eip(`${name}-nat-eip-1`, { domain: "vpc" }, { parent: this });
        const eip2 = new aws.ec2.Eip(`${name}-nat-eip-2`, { domain: "vpc" }, { parent: this });

        // NAT Gateways (2 - one per AZ)
        const natGw1 = new aws.ec2.NatGateway(`${name}-nat-gw-1`, {
            subnetId: publicSubnet1.id,
            allocationId: eip1.id,
        }, { parent: this });

        const natGw2 = new aws.ec2.NatGateway(`${name}-nat-gw-2`, {
            subnetId: publicSubnet2.id,
            allocationId: eip2.id,
        }, { parent: this });

        // Public Route Table
        const publicRt = new aws.ec2.RouteTable(`${name}-public-rt`, {
            vpcId: vpc.id,
        }, { parent: this });
        // Adds an individual routing rule to the route table:
        new aws.ec2.Route(`${name}-public-route`, {
            routeTableId: publicRt.id,
            destinationCidrBlock: "0.0.0.0/0",
            gatewayId: igw.id,
        }, { parent: this });
        // Associating each route table with a subnet (public and private) using Terraform is important:
        new aws.ec2.RouteTableAssociation(`${name}-public-rta-1`, {
            subnetId: publicSubnet1.id,
            routeTableId: publicRt.id,
        }, { parent: this });

        new aws.ec2.RouteTableAssociation(`${name}-public-rta-2`, {
            subnetId: publicSubnet2.id,
            routeTableId: publicRt.id,
        }, { parent: this });

        // Private Route Tables (2 - one per AZ)
        const privateRt1 = new aws.ec2.RouteTable(`${name}-private-rt-1`, {
            vpcId: vpc.id,
        }, { parent: this });

        new aws.ec2.Route(`${name}-private-route-1`, {
            routeTableId: privateRt1.id,
            destinationCidrBlock: "0.0.0.0/0",
            natGatewayId: natGw1.id,
        }, { parent: this });

        new aws.ec2.RouteTableAssociation(`${name}-private-rta-1`, {
            subnetId: privateSubnet1.id,
            routeTableId: privateRt1.id,
        }, { parent: this });

        const privateRt2 = new aws.ec2.RouteTable(`${name}-private-rt-2`, {
            vpcId: vpc.id,
        }, { parent: this });

        new aws.ec2.Route(`${name}-private-route-2`, {
            routeTableId: privateRt2.id,
            destinationCidrBlock: "0.0.0.0/0",
            natGatewayId: natGw2.id,
        }, { parent: this });

        new aws.ec2.RouteTableAssociation(`${name}-private-rta-2`, {
            subnetId: privateSubnet2.id,
            routeTableId: privateRt2.id,
        }, { parent: this });

        // Outputs
        this.vpcId = vpc.id;
        this.publicSubnetIds = pulumi.output([publicSubnet1.id, publicSubnet2.id]);
        this.privateSubnetIds = pulumi.output([privateSubnet1.id, privateSubnet2.id]);

        this.registerOutputs({
            vpcId: this.vpcId,
            publicSubnetIds: this.publicSubnetIds,
            privateSubnetIds: this.privateSubnetIds,
        });
    }
}
