# Terraform

## Installation
[link](https://learn.hashicorp.com/tutorials/terraform/install-cli)
macOS
```
brew install hashicorp/tap/terraform
```

## Usage
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

* [command to destroy everything](https://learn.hashicorp.com/tutorials/terraform/aws-destroy)
```
terraform destroy
```
