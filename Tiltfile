k8s_yaml('./deploy/k8s.yaml')

docker_build('mux-devex/playbackproblems-backend', 'backend')

k8s_resource('playbackproblems-http', port_forwards=13000)
k8s_resource('playbackproblems-postgres', port_forwards=5432)
k8s_resource('playbackproblems-redis', port_forwards=6379)