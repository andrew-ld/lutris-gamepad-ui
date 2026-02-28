FROM node:24-trixie AS builder

RUN apt-get update && apt-get install -y squashfs-tools

COPY . /build

WORKDIR /build

RUN npm i

RUN npm run build

RUN bash -c "cp /build/release/*.AppImage /release.AppImage"

FROM scratch AS export

COPY --from=builder /release.AppImage .
