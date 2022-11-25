# base image
FROM ubuntu:22.10 as base

ENV NODE_ENV=development

# user context for agent
RUN addgroup --system log_viewer_agent && adduser --system --ingroup log_viewer_agent log_viewer_agent

# install dependencies
RUN apt-get update
RUN apt-get -y install curl gnupg
RUN curl -sL https://deb.nodesource.com/setup_18.x  | bash -
RUN apt-get -y install nodejs

# install npm
RUN npm install -g npm@9.1.2

# create a directory for the source code and use it as base path
WORKDIR /home/log_viewer_agent/app

# copy dependencies
COPY package.json ./
COPY tsconfig.json ./
COPY .env ./
RUN npm install && npm cache clean --force

# run node as our least privilege user
USER log_viewer_agent

FROM base as dev
CMD ["npm", "run", "start:dev"]

FROM base as prd
CMD ["npm", "run", "start:prd"]
