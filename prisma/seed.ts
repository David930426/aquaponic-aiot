import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Reset collections — order matters because we have relations.
  await prisma.session.deleteMany();
  await prisma.sensorReading.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.device.deleteMany();
  await prisma.zone.deleteMany();
  await prisma.user.deleteMany();

  // Seed admin user — password "demo1234" (bcrypt-hashed).
  const passwordHash = await bcrypt.hash("demo1234", 10);
  await prisma.user.create({
    data: {
      email: "alex@aquawatch.dev",
      name: "Alex Chen",
      passwordHash,
      role: "admin",
    },
  });

  const zone = await prisma.zone.create({
    data: { id: "zone-001", name: "Aquaponics Greenhouse A" },
  });

  const devices = [
    {
      id: "dev-001",
      name: "Water Pump - Main",
      deviceType: "pump",
      status: "running",
      isEnabled: true,
      readingLabel: null,
      readingValue: null,
      readingRaw: null,
      readingUnit: null,
      safeMin: null,
      safeMax: null,
    },
    {
      id: "dev-002",
      name: "Temp Sensor - Tank A",
      deviceType: "sensor_temp",
      status: "active",
      isEnabled: true,
      readingLabel: "Current reading",
      readingValue: "22.0°C",
      readingRaw: 22.0,
      readingUnit: "°C",
      safeMin: 18,
      safeMax: 25,
    },
    {
      id: "dev-003",
      name: "pH Sensor - Tank A",
      deviceType: "sensor_ph",
      status: "active",
      isEnabled: true,
      readingLabel: "Current reading",
      readingValue: "7.2",
      readingRaw: 7.2,
      readingUnit: "",
      safeMin: 6.5,
      safeMax: 7.5,
    },
    {
      id: "dev-004",
      name: "Nutrient Feeder 1",
      deviceType: "feeder",
      status: "scheduled",
      isEnabled: true,
      readingLabel: "Next Feed time",
      readingValue: "14:00",
      readingRaw: null,
      readingUnit: "",
      safeMin: null,
      safeMax: null,
    },
    {
      id: "dev-005",
      name: "Aeration Pump",
      deviceType: "aeration",
      status: "idle",
      isEnabled: false,
      readingLabel: null,
      readingValue: null,
      readingRaw: null,
      readingUnit: null,
      safeMin: null,
      safeMax: null,
    },
    {
      id: "dev-006",
      name: "Water Level Sensor",
      deviceType: "sensor_level",
      status: "active",
      isEnabled: true,
      readingLabel: "Level",
      readingValue: "85%",
      readingRaw: 85,
      readingUnit: "%",
      safeMin: 60,
      safeMax: 95,
    },
    {
      id: "dev-007",
      name: "Lighting Controller",
      deviceType: "lighting",
      status: "on",
      isEnabled: true,
      readingLabel: "Brightness",
      readingValue: "70%",
      readingRaw: 70,
      readingUnit: "%",
      safeMin: null,
      safeMax: null,
    },
    {
      id: "dev-008",
      name: "DO Sensor - Tank B",
      deviceType: "sensor_do",
      status: "calibrating",
      isEnabled: true,
      readingLabel: "Current reading",
      readingValue: "8.5 mg/L",
      readingRaw: 8.5,
      readingUnit: "mg/L",
      safeMin: 5,
      safeMax: 12,
    },
  ];

  for (const d of devices) {
    await prisma.device.create({ data: { ...d, zoneId: zone.id } });
  }

  await prisma.alert.createMany({
    data: [
      {
        zoneId: zone.id,
        deviceId: "dev-003",
        deviceName: "pH Sensor - Tank A",
        severity: "critical",
        message: "Tank A pH level drifted below 6.8",
        isRead: false,
        triggeredAt: new Date(Date.now() - 35 * 60 * 1000),
      },
      {
        zoneId: zone.id,
        deviceId: "dev-006",
        deviceName: "Water Level Sensor",
        severity: "warning",
        message: "Tank B level is at 80%",
        isRead: false,
        triggeredAt: new Date(Date.now() - 65 * 60 * 1000),
      },
      {
        zoneId: zone.id,
        deviceId: "dev-001",
        deviceName: "System",
        severity: "info",
        message: "Firmware update completed",
        isRead: true,
        triggeredAt: new Date(Date.now() - 19 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.schedule.createMany({
    data: [
      {
        zoneId: zone.id,
        deviceId: "dev-004",
        name: "Fish Feed - Morning",
        cron: "0 8 * * *",
        action: "feed_2g",
        isEnabled: true,
        nextRunAt: new Date(new Date().setHours(8, 0, 0, 0)),
      },
      {
        zoneId: zone.id,
        deviceId: "dev-004",
        name: "Fish Feed - Lunch",
        cron: "0 14 * * *",
        action: "feed_2g",
        isEnabled: true,
        nextRunAt: new Date(new Date().setHours(14, 0, 0, 0)),
      },
      {
        zoneId: zone.id,
        deviceId: "dev-007",
        name: "Lighting - Day mode",
        cron: "0 6,18 * * *",
        action: "lights_on",
        isEnabled: true,
        nextRunAt: new Date(new Date().setHours(18, 0, 0, 0)),
      },
    ],
  });

  // 7 days × 24 hours of sensor readings — deterministic sine wave for clean charts.
  const now = Date.now();
  const readings: {
    deviceId: string;
    value: number;
    unit: string;
    recordedAt: Date;
  }[] = [];

  for (let h = 7 * 24 - 1; h >= 0; h--) {
    const at = new Date(now - h * 60 * 60 * 1000);
    const dayPhase = (h % 24) / 24;
    const wave = Math.sin(dayPhase * 2 * Math.PI);

    readings.push({
      deviceId: "dev-002",
      value: 22 + wave * 3 + (Math.random() - 0.5) * 0.6,
      unit: "°C",
      recordedAt: at,
    });
    readings.push({
      deviceId: "dev-003",
      value: 7.1 + wave * 0.3 + (Math.random() - 0.5) * 0.15,
      unit: "",
      recordedAt: at,
    });
    readings.push({
      deviceId: "dev-006",
      value: 82 + wave * 6 + (Math.random() - 0.5) * 2,
      unit: "%",
      recordedAt: at,
    });
    readings.push({
      deviceId: "dev-008",
      value: 8.2 + wave * 1.5 + (Math.random() - 0.5) * 0.3,
      unit: "mg/L",
      recordedAt: at,
    });
  }
  await prisma.sensorReading.createMany({ data: readings });

  console.log("Seed complete:", {
    users: 1,
    zones: 1,
    devices: devices.length,
    alerts: 3,
    schedules: 3,
    readings: readings.length,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
