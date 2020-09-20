# Terraform

## Installation
[link](https://learn.hashicorp.com/tutorials/terraform/install-cli)
macOS
```
brew install hashicorp/tap/terraform
```

## Usage

### Standard Workflow

* Go to the terraform directory which has .tf files

* [command to initialize (only run for the first time)](https://learn.hashicorp.com/tutorials/terraform/aws-build)
```
terraform init
```

* [Note: Terraform 0.11 and earlier require running terraform plan before terraform apply](https://learn.hashicorp.com/tutorials/terraform/aws-build)
```
terraform plan
```

* [command to deploy resources](https://learn.hashicorp.com/tutorials/terraform/aws-build)
```
terraform apply
```

* [command to deploy resources with auto approve](https://learn.hashicorp.com/tutorials/terraform/aws-build)
```
terraform apply -auto-approve
```

* [command to deploy resources with certain variables](https://learn.hashicorp.com/tutorials/terraform/aws-build)
```
terraform apply -var-file ${}.tfvars

For example,
terraform apply -var-file workspace/dev.tfvars
```

* [command to destroy everything](https://learn.hashicorp.com/tutorials/terraform/aws-destroy)
```
terraform destroy
```

### [Workspace Usage](https://www.terraform.io/docs/state/workspaces.html)
```
Usage: terraform workspace

  new, list, show, select and delete Terraform workspaces.

Subcommands:
    delete    Delete a workspace
    list      List Workspaces
    new       Create a new workspace
    select    Select a workspace
    show      Show the name of the current workspace
```

```
terraform workspace list
terraform workspace new test
terraform workspace select test
terraform workspace show
terraform workspace delete test
```

