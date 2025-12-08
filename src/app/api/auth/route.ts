import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(){
    const sess = await getSession()
    return NextResponse.json(sess)
}