# Getting Started

 1. Initialize a new Pulumi project:

    ```bash
    pulumi new aws-typescript
    ```

    Follow the prompts to set your:
    - Project name
    - Project description
    - AWS region (defaults to `us-east-1`)

 2. Preview and deploy your infrastructure:

    ```bash
    pulumi preview
    pulumi up
    ```

 3. When you're finished, tear down your stack:

    ```bash
    pulumi destroy     #(This deletes AWS resources created by the stack,)
    pulumi stack rm  #deletes the Pulumi state file, so you cannot run "pulumi up" again for that stack
    ```



## Avoiding conflict with Terraform resources/state:

- Make sure create a AWS credentials profile 
```
[default]
aws_access_key_id=...
aws_secret_access_key=...

[pulumi]
aws_access_key_id=...
aws_secret_access_key=...
```


And configured in this way later:
```
pulumi config set aws:profile pulumi
pulumi config set aws:region eu-central-1    # or your region
```


- Create Pulumi resources adding default `Tags`(using Resource Transformation hook),  and `naming conventions` starting with `plm-`:

```
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Register a stack-wide transformation to inject default tags
pulumi.runtime.registerStackTransformation((args) => {
    const props = args.props as any;

    // If the resource supports tags, merge in our default
    if (props && typeof props === "object" && "tags" in props) {
        props.tags = {
            ...props.tags,
            ManagedBy: "Pulumi",
        };
    }

    return {
        props,
        opts: args.opts,
    };
});

// Create an AWS resource (S3 Bucket) – NO need to specify ManagedBy here
const bucket = new aws.s3.Bucket("plm-my-bucket-1234567890-pulumi-demo-dantej", {
    // Optional: you can still add other custom tags, they’ll be merged
    // tags: {
    //     Project: "demo",
    // },
});

// Export the name of the bucket
export const bucketName = bucket.id;
```


- In Terraform we will detail `Profile` and `Tags` inside the Provider in this way to avoid conflicts:
```
provider "aws" {
  profile = "default"
  region  = "eu-central-1"

  default_tags {
    tags = {
      ManagedBy = "Terraform"
    }
  }
}
```


And use `naming conventions` for terraform starting with `tf-`:
```
resource "aws_s3_bucket" "tf-my-bucket-123" {
  bucket = "my-bucket-1234567890-pulumi-demo-dantej"
}
```