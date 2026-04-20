// import { NextResponse } from "next/server";
// import { connectDB } from "@/lib/db";
// import GFPS from "@/models/gfps";
// import GFPSArchive from "@/models/gfpsArchive";

// export async function POST(req) {
//   try {
//     await connectDB();

//     const body = await req.json();
//     const { gfpsId } = body;

//     if (!gfpsId) {
//       return NextResponse.json(
//         { error: "gfpsId is required" },
//         { status: 400 },
//       );
//     }
//     const gfps = await GFPS.findById(gfpsId);

//     if (!gfps) {
//       return NextResponse.json({ error: "GFPS not found" }, { status: 404 });
//     }
//     const archive = await GFPSArchive.create({
//       gfpsId,
//       snapshot: gfps.toObject(),
//       archivedAt: new Date(),
//     });

//     return NextResponse.json(archive, { status: 201 });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// export async function GET(req) {
//   try {
//     await connectDB();

//     const { searchParams } = new URL(req.url);

//     const gfpsId = searchParams.get("gfpsId");
//     const year = searchParams.get("year");

//     const filter = {};
//     if (gfpsId) filter.gfpsId = gfpsId;
//     if (year) filter.year = Number(year);

//     const archives = await GFPSArchive.find(filter).sort({ archivedAt: -1 });

//     return NextResponse.json(archives);
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }
