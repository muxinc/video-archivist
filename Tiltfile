k8s_yaml('./deploy/shared.yaml')

if "DEPLOY_TARGET" not in os.environ:
    raise "environment variable 'DEPLOY_TARGET' must be set."

k8s_yaml('./deploy/' + os.environ['DEPLOY_TARGET'] + '.yaml')

docker_build('mux-devex/playbackproblems-backend', 'backend')

k8s_resource('playbackproblems-http', port_forwards=13000)
k8s_resource('playbackproblems-postgres', port_forwards=5432)
k8s_resource('playbackproblems-redis', port_forwards=6379)