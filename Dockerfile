FROM python:3.6-alpine

ENV FLASK_APP flasky.py
ENV FLASK_CONFIG production

RUN adduser -D flasky
USER flasky

WORKDIR /home/flasky

COPY requirements requirements
RUN python -m venv venv
RUN venv/bin/pip install -r requirements/docker.txt

COPY app app
COPY migrations migrations
USER root
COPY flasky.py config.py boot.sh ./
RUN sed -i 's/\r$//' boot.sh && chmod +x boot.sh
USER flasky

EXPOSE 5000
ENTRYPOINT ["./boot.sh"]
