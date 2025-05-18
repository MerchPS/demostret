import { MongoClient, ServerApiVersion } from "mongodb";

const uri = "mongodb+srv://HansDB:Hansmoses2007%23@lisensi.98zue9l.mongodb.net/?retryWrites=true&w=majority&appName=Lisensi";

// Mongo client setup
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      await client.connect();
      const db = client.db("lisensidb"); // Ubah ke nama database kamu
      const collection = db.collection("users");

      const data = req.body;

      // Simpan data ke MongoDB
      const result = await collection.insertOne(data);

      res.status(200).json({ success: true, insertedId: result.insertedId });
    } catch (error) {
      console.error("Mongo Error:", error);
      res.status(500).json({ success: false, error: error.message });
    } finally {
      await client.close();
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
