/**
 * Seed script — run once to populate the City collection.
 * Usage: node Backend/db/seedCities.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]); // fix Atlas SRV on ISP DNS
const mongoose = require("mongoose");
const City = require("../model/City");

const CITIES = [
  // ── North Gujarat ─────────────────────────────────────────────────────────
  { name: "Palanpur",           state: "Gujarat", district: "Banaskantha",  region: "North Gujarat" },
  { name: "Deodar",             state: "Gujarat", district: "Banaskantha",  region: "North Gujarat" },
  { name: "Deesa",              state: "Gujarat", district: "Banaskantha",  region: "North Gujarat" },
  { name: "Dhanera",            state: "Gujarat", district: "Banaskantha",  region: "North Gujarat" },
  { name: "Radhanpur",          state: "Gujarat", district: "Patan",        region: "North Gujarat" },
  { name: "Harij",              state: "Gujarat", district: "Patan",        region: "North Gujarat" },
  { name: "Chanasma",           state: "Gujarat", district: "Patan",        region: "North Gujarat" },
  { name: "Patan",              state: "Gujarat", district: "Patan",        region: "North Gujarat" },
  { name: "Sidhpur",            state: "Gujarat", district: "Patan",        region: "North Gujarat" },
  { name: "Unjha",              state: "Gujarat", district: "Mahesana",     region: "North Gujarat" },
  { name: "Mahesana",           state: "Gujarat", district: "Mahesana",     region: "North Gujarat" },
  { name: "Visnagar",           state: "Gujarat", district: "Mahesana",     region: "North Gujarat" },
  { name: "Kadi",               state: "Gujarat", district: "Mahesana",     region: "North Gujarat" },
  { name: "Kalol",              state: "Gujarat", district: "Gandhinagar",  region: "North Gujarat" },
  { name: "Becharaji",          state: "Gujarat", district: "Mahesana",     region: "North Gujarat" },
  { name: "Vijapur",            state: "Gujarat", district: "Mahesana",     region: "North Gujarat" },
  { name: "Mansa",              state: "Gujarat", district: "Gandhinagar",  region: "North Gujarat" },
  { name: "Prantij",            state: "Gujarat", district: "Sabarkantha",  region: "North Gujarat" },
  { name: "Himmatnagar",        state: "Gujarat", district: "Sabarkantha",  region: "North Gujarat" },
  { name: "Idar",               state: "Gujarat", district: "Sabarkantha",  region: "North Gujarat" },
  { name: "Shamlaji",           state: "Gujarat", district: "Aravalli",     region: "North Gujarat" },
  { name: "Modasa",             state: "Gujarat", district: "Aravalli",     region: "North Gujarat" },
  { name: "Dhansura",           state: "Gujarat", district: "Aravalli",     region: "North Gujarat" },
  { name: "Talod",              state: "Gujarat", district: "Sabarkantha",  region: "North Gujarat" },
  { name: "Bayad",              state: "Gujarat", district: "Aravalli",     region: "North Gujarat" },

  // ── Kutch ─────────────────────────────────────────────────────────────────
  { name: "Bhuj",               state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Anjar",              state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Gandhidham",         state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Adipur",             state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Mundra",             state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Mandvi",             state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Bhachau",            state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Rapar",              state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Nakhatrana",         state: "Gujarat", district: "Kutch",        region: "Kutch" },
  { name: "Samakhiali",         state: "Gujarat", district: "Kutch",        region: "Kutch" },

  // ── Saurashtra ────────────────────────────────────────────────────────────
  { name: "Rajkot",             state: "Gujarat", district: "Rajkot",       region: "Saurashtra" },
  { name: "Jamnagar",           state: "Gujarat", district: "Jamnagar",     region: "Saurashtra" },
  { name: "Junagadh",           state: "Gujarat", district: "Junagadh",     region: "Saurashtra" },
  { name: "Porbandar",          state: "Gujarat", district: "Porbandar",    region: "Saurashtra" },
  { name: "Bhavnagar",          state: "Gujarat", district: "Bhavnagar",    region: "Saurashtra" },
  { name: "Morbi",              state: "Gujarat", district: "Morbi",        region: "Saurashtra" },
  { name: "Surendranagar",      state: "Gujarat", district: "Surendranagar",region: "Saurashtra" },
  { name: "Amreli",             state: "Gujarat", district: "Amreli",       region: "Saurashtra" },
  { name: "Gondal",             state: "Gujarat", district: "Rajkot",       region: "Saurashtra" },
  { name: "Veraval",            state: "Gujarat", district: "Gir Somnath",  region: "Saurashtra" },
  { name: "Somnath",            state: "Gujarat", district: "Gir Somnath",  region: "Saurashtra" },
  { name: "Dwarka",             state: "Gujarat", district: "Devbhumi Dwarka", region: "Saurashtra" },
  { name: "Botad",              state: "Gujarat", district: "Botad",        region: "Saurashtra" },
  { name: "Sihor",              state: "Gujarat", district: "Bhavnagar",    region: "Saurashtra" },
  { name: "Palitana",           state: "Gujarat", district: "Bhavnagar",    region: "Saurashtra" },
  { name: "Dhrangadhra",        state: "Gujarat", district: "Surendranagar",region: "Saurashtra" },
  { name: "Wankaner",           state: "Gujarat", district: "Morbi",        region: "Saurashtra" },
  { name: "Upleta",             state: "Gujarat", district: "Rajkot",       region: "Saurashtra" },
  { name: "Dhoraji",            state: "Gujarat", district: "Rajkot",       region: "Saurashtra" },
  { name: "Jetpur",             state: "Gujarat", district: "Rajkot",       region: "Saurashtra" },
  { name: "Jasdan",             state: "Gujarat", district: "Rajkot",       region: "Saurashtra" },
  { name: "Tankara",            state: "Gujarat", district: "Morbi",        region: "Saurashtra" },
  { name: "Keshod",             state: "Gujarat", district: "Junagadh",     region: "Saurashtra" },
  { name: "Vinchhiya",          state: "Gujarat", district: "Rajkot",       region: "Saurashtra" },
  { name: "Mahuva",             state: "Gujarat", district: "Bhavnagar",    region: "Saurashtra" },

  // ── Central Gujarat ───────────────────────────────────────────────────────
  { name: "Gandhinagar",        state: "Gujarat", district: "Gandhinagar",  region: "Central Gujarat" },
  { name: "Ahmedabad",          state: "Gujarat", district: "Ahmedabad",    region: "Central Gujarat" },
  { name: "Narol",              state: "Gujarat", district: "Ahmedabad",    region: "Central Gujarat" },
  { name: "Sanand",             state: "Gujarat", district: "Ahmedabad",    region: "Central Gujarat" },
  { name: "Viramgam",           state: "Gujarat", district: "Ahmedabad",    region: "Central Gujarat" },
  { name: "Bavla",              state: "Gujarat", district: "Ahmedabad",    region: "Central Gujarat" },
  { name: "Dholka",             state: "Gujarat", district: "Ahmedabad",    region: "Central Gujarat" },
  { name: "Bagodara",           state: "Gujarat", district: "Ahmedabad",    region: "Central Gujarat" },
  { name: "Nadiad",             state: "Gujarat", district: "Kheda",        region: "Central Gujarat" },
  { name: "Anand",              state: "Gujarat", district: "Anand",        region: "Central Gujarat" },
  { name: "Kheda",              state: "Gujarat", district: "Kheda",        region: "Central Gujarat" },
  { name: "Kapadvanj",          state: "Gujarat", district: "Kheda",        region: "Central Gujarat" },
  { name: "Thasra",             state: "Gujarat", district: "Kheda",        region: "Central Gujarat" },
  { name: "Balasinor",          state: "Gujarat", district: "Kheda",        region: "Central Gujarat" },
  { name: "Karamsad",           state: "Gujarat", district: "Anand",        region: "Central Gujarat" },
  { name: "Vallabh Vidyanagar", state: "Gujarat", district: "Anand",        region: "Central Gujarat" },
  { name: "Vadodara",           state: "Gujarat", district: "Vadodara",     region: "Central Gujarat" },
  { name: "Padra",              state: "Gujarat", district: "Vadodara",     region: "Central Gujarat" },
  { name: "Dahod",              state: "Gujarat", district: "Dahod",        region: "Central Gujarat" },
  { name: "Godhra",             state: "Gujarat", district: "Panchmahal",   region: "Central Gujarat" },
  { name: "Halol",              state: "Gujarat", district: "Panchmahal",   region: "Central Gujarat" },
  { name: "Lunawada",           state: "Gujarat", district: "Mahisagar",    region: "Central Gujarat" },

  // ── South Gujarat ─────────────────────────────────────────────────────────
  { name: "Jambusar",           state: "Gujarat", district: "Bharuch",      region: "South Gujarat" },
  { name: "Ankleshwar",         state: "Gujarat", district: "Bharuch",      region: "South Gujarat" },
  { name: "Bharuch",            state: "Gujarat", district: "Bharuch",      region: "South Gujarat" },
  { name: "Palej",              state: "Gujarat", district: "Bharuch",      region: "South Gujarat" },
  { name: "Surat",              state: "Gujarat", district: "Surat",        region: "South Gujarat" },
  { name: "Bardoli",            state: "Gujarat", district: "Surat",        region: "South Gujarat" },
  { name: "Olpad",              state: "Gujarat", district: "Surat",        region: "South Gujarat" },
  { name: "Navsari",            state: "Gujarat", district: "Navsari",      region: "South Gujarat" },
  { name: "Bilimora",           state: "Gujarat", district: "Navsari",      region: "South Gujarat" },
  { name: "Chikhli",            state: "Gujarat", district: "Navsari",      region: "South Gujarat" },
  { name: "Gandevi",            state: "Gujarat", district: "Navsari",      region: "South Gujarat" },
  { name: "Valsad",             state: "Gujarat", district: "Valsad",       region: "South Gujarat" },
  { name: "Pardi",              state: "Gujarat", district: "Valsad",       region: "South Gujarat" },
  { name: "Vapi",               state: "Gujarat", district: "Valsad",       region: "South Gujarat" },
  { name: "Umargam",            state: "Gujarat", district: "Valsad",       region: "South Gujarat" },
  { name: "Vyara",              state: "Gujarat", district: "Tapi",         region: "South Gujarat" },
  { name: "Dharampur",          state: "Gujarat", district: "Valsad",       region: "South Gujarat" },

  // ── Maharashtra (border/metro) ────────────────────────────────────────────
  { name: "Palghar",            state: "Maharashtra", district: "Palghar",  region: "Maharashtra" },
  { name: "Boisar",             state: "Maharashtra", district: "Palghar",  region: "Maharashtra" },
  { name: "Virar",              state: "Maharashtra", district: "Palghar",  region: "Maharashtra" },
  { name: "Vasai",              state: "Maharashtra", district: "Palghar",  region: "Maharashtra" },
  { name: "Nalasopara",         state: "Maharashtra", district: "Palghar",  region: "Maharashtra" },
  { name: "Mira Road",          state: "Maharashtra", district: "Thane",    region: "Maharashtra" },
  { name: "Thane",              state: "Maharashtra", district: "Thane",    region: "Maharashtra" },
  { name: "Mumbai",             state: "Maharashtra", district: "Mumbai",   region: "Maharashtra" },
  { name: "Pune",               state: "Maharashtra", district: "Pune",     region: "Maharashtra" },
  { name: "Nashik",             state: "Maharashtra", district: "Nashik",   region: "Maharashtra" },

  // ── Rajasthan (border cities) ─────────────────────────────────────────────
  { name: "Abu Road",           state: "Rajasthan",   district: "Sirohi",   region: "Rajasthan" },
  { name: "Sirohi",             state: "Rajasthan",   district: "Sirohi",   region: "Rajasthan" },
  { name: "Udaipur",            state: "Rajasthan",   district: "Udaipur",  region: "Rajasthan" },
];

async function seed() {
  try {
    await mongoose.connect(process.env.DATABASE_URI || process.env.MONGO_URL || process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    let inserted = 0;
    for (const city of CITIES) {
      await City.updateOne(
        { name: city.name },
        { $setOnInsert: city },
        { upsert: true }
      );
      inserted++;
    }
    console.log(`Seeded ${inserted} cities (upserted, no duplicates).`);
  } catch (err) {
    console.error("Seed error:", err);
  } finally {
    await mongoose.connection.close();
  }
}

seed();
