# Secrets Scaffolding (SOPS + age)

This folder contains templates only. Do not commit plaintext production secrets.

## Source of truth

- Encrypted secrets files managed with `sops` and `age`.
- Local/CI/staging decrypt at runtime into environment variables or mounted files.

## Templates

- `.sops.yaml.template`: baseline key and path rules.
- `templates/secrets.enc.yaml.template`: encrypted-file schema to copy from.
- `templates/age-recipients.example.txt`: placeholder for team public keys.

## Usage sketch

1. Copy templates and replace placeholders.
2. Create an age key pair per environment owner.
3. Encrypt secrets with `sops` before commit.
4. Load secrets in compose/CI as env at runtime.

