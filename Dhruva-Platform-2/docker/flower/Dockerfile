FROM mher/flower:latest
USER root

RUN apk add --no-cache bash

# Add wait-for-it
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

USER flower

# Wait for RabbitMQ and then start Flower
ENTRYPOINT ["/wait-for-it.sh", "rabbitmq_server:5672", "--timeout=30", "--strict", "--", "python3", "-m", "flower", "flower"]
CMD ["--broker=amqp://admin:admin123@rabbitmq_server:5672/dhruva_host", "--address=0.0.0.0", "--port=5555"]
