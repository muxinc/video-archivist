# HOW TO DEPLOY #
- **First**, make sure the `KUBECONFIG` env var is properly set.

- store the following secrets based on external services:
    - `playbackproblems-github` - just the access token string, e.g.. `kubectl create secret generic playbackproblems-github --from-literal=access-token=$(echo $GITHUB_ACCESS_TOKEN)`
    - `playbackproblems-gcp` - save the entire file, e.g. `kubectl create secret generic playbackproblems-gcp --from-file=google-credentials.json`

- create and set a database username/password secret (same process as above but with a generated password):
    - `kubectl create secret generic playbackproblems-postgres --from-literal=username=playbackproblems --from-literal=password=$(head /dev/random | md5sum | cut -f1 -d' ')`

- go run `tilt` from the root of the repo: `tilt up`

## Accessing Postgres ##
You can access the Postgres node by spinning up a bash shell in the postgres pod.

- First do `kubectl get pods` and find your `playbackproblems-postgres` pod. For example, mine is `playbackproblems-postgres-0`.
- Do `kubectl exec -it playbackproblems-postgres-0 -- /bin/bash`.
- At that bash prompt, do `PGPASSWORD=$POSTGRES_PASSWORD psql -U $POSTGRES_USER` to connect.