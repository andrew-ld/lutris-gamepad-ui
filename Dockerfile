FROM node:22 AS builder

COPY . /build

WORKDIR /build

RUN npm i

RUN npm run build

RUN bash -c "cp /build/release/*.AppImage /release.AppImage"

FROM scratch AS export

COPY --from=builder /release.AppImage .
