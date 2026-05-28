import { Gender } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { normalizeTurkishMobilePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";
import { isProfessionValue } from "@/lib/professions";
import { normalizeTurkeyCity } from "@/lib/turkey-cities";

type ProfilePayload = {
  birthDate?: string;
  city?: string;
  gender?: string;
  name?: string;
  phone?: string;
  profession?: string;
  surname?: string;
};

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as ProfilePayload;
  const name = payload.name?.trim() ?? "";
  const surname = payload.surname?.trim() ?? "";
  const rawCity = payload.city?.trim() ?? "";
  const city = normalizeTurkeyCity(rawCity);
  const profession = payload.profession?.trim() ?? "";
  const rawPhone = payload.phone?.trim() ?? "";
  const phone = rawPhone ? normalizeTurkishMobilePhone(rawPhone) : null;

  if (!name || !surname || !rawCity || !profession) {
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

  if (rawPhone && !phone) {
    return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  }

  const user = await prisma.user.update({
    data: {
      birthDate: parseBirthDate(payload.birthDate),
      city,
      gender: parseGender(payload.gender),
      name,
      phone,
      profession,
      surname,
    },
    select: {
      birthDate: true,
      city: true,
      email: true,
      gender: true,
      name: true,
      passwordHash: true,
      phone: true,
      profession: true,
      surname: true,
    },
    where: {
      id: userId,
    },
  });

  const { passwordHash, ...profileUser } = user;

  return NextResponse.json({
    user: {
      ...profileUser,
      birthDate: user.birthDate ? toDateInputValue(user.birthDate) : "",
      hasPassword: Boolean(passwordHash),
    },
  });
}

function parseBirthDate(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function parseGender(value?: string) {
  if (!value) {
    return null;
  }

  return Object.values(Gender).includes(value as Gender)
    ? (value as Gender)
    : null;
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}
