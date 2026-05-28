import { Gender } from "@prisma/client";
import { hash } from "bcryptjs";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { isProfessionValue } from "@/lib/professions";
import { normalizeTurkeyCity } from "@/lib/turkey-cities";

const minPasswordLength = 8;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterPayload = {
  birthDate?: string;
  city?: string;
  email?: string;
  gender?: string;
  name?: string;
  password?: string;
  phone?: string;
  profession?: string;
  surname?: string;
};

export const runtime = "nodejs";

export async function POST(request: Request) {
  const payload = (await request.json()) as RegisterPayload;
  const email = normalizeEmail(payload.email);
  const password = payload.password?.trim() ?? "";
  const name = payload.name?.trim() ?? "";
  const surname = payload.surname?.trim() ?? "";
  const rawCity = payload.city?.trim() ?? "";
  const city = normalizeTurkeyCity(rawCity);
  const profession = payload.profession?.trim() ?? "";
  const phone = normalizePhone(payload.phone);

  if (!name || !surname || !rawCity || !profession || !email || !password) {
    return NextResponse.json(
      { error: "missing_required_fields" },
      { status: 400 },
    );
  }

  if (!city) {
    return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  }

  if (!isProfessionValue(profession)) {
    return NextResponse.json(
      { error: "invalid_profession" },
      { status: 400 },
    );
  }

  if (!emailPattern.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  if (password.length < minPasswordLength) {
    return NextResponse.json({ error: "weak_password" }, { status: 400 });
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  if (existingUser) {
    return NextResponse.json({ error: "email_exists" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const birthDate = parseBirthDate(payload.birthDate);
  const gender = parseGender(payload.gender);

  const user = await prisma.user.create({
    data: {
      birthDate,
      city,
      email,
      gender,
      name,
      passwordHash,
      phone,
      profession,
      surname,
    },
    select: {
      email: true,
      id: true,
    },
  });

  return NextResponse.json({ user }, { status: 201 });
}

function normalizeEmail(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizePhone(value?: string) {
  const phone = value?.trim().replace(/\s+/g, " ") ?? "";

  return phone || undefined;
}

function parseBirthDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseGender(value?: string) {
  if (!value) {
    return undefined;
  }

  return Object.values(Gender).includes(value as Gender)
    ? (value as Gender)
    : undefined;
}
