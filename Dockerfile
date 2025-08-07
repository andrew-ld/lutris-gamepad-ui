FROM ubuntu:25.04 AS builder

RUN apt update && apt install -y && apt install -y build-essential git meson \
    libwayland-dev wayland-protocols libdrm-dev libpixman-1-dev \
    libxkbcommon-dev libxkbcommon-x11-dev libinput-dev \
    libgl1-mesa-dev libegl1-mesa-dev libgbm-dev \
    libcairo2-dev libxcursor-dev npm hwdata libxcb-composite0-dev

COPY . /build

WORKDIR /build

RUN npm i

RUN npm run build

RUN bash -c "cp /build/dist/*.AppImage /release.AppImage"

FROM scratch AS export

COPY --from=builder /release.AppImage .
