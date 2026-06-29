const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');
const ENABLE_AUGMENTATION = process.env.ENABLE_AUGMENTATION === 'true';
const ROTATION_ANGLES = [];
for (let a = 5; a < 360; a += 5) {
  ROTATION_ANGLES.push(a);
}
const BLUR_SIGMAS = [1, 2, 3, 4, 5];

const uri = "mongodb+srv://parthhkdigiverse1_db_user:root123@cluster0.sgepsbi.mongodb.net/vwc_db?retryWrites=true&w=majority&appName=Cluster0";
const workspaceId = "12345678-1234-1234-1234-1234567890ab";

let processor, model;
async function generateEmbedding(imagePath) {
  const { AutoProcessor, CLIPVisionModelWithProjection, RawImage } = require('@xenova/transformers');
  if (!processor || !model) {
    console.log("Loading CLIP Vision model and processor inside Seeder...");
    processor = await AutoProcessor.from_pretrained('Xenova/clip-vit-large-patch14');
    model = await CLIPVisionModelWithProjection.from_pretrained('Xenova/clip-vit-large-patch14');
  }
  const image = await RawImage.read(imagePath);
  const image_inputs = await processor(image);
  const output = await model(image_inputs);
  const rawVector = Array.from(output.image_embeds.data);

  let sumSq = 0;
  for (const val of rawVector) {
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  return rawVector.map((v) => v / (norm || 1));
}

async function run() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected successfully to MongoDB Atlas");

    const db = client.db("vwc_db");

    // 1. Seed Workspace
    const workspaces = db.collection("workspaces");
    await workspaces.updateOne(
      { id: workspaceId },
      {
        $set: {
          id: workspaceId,
          name: "Textile Co - India",
          slug: "textile-co-india",
          created_at: new Date(),
          updated_at: new Date()
        }
      },
      { upsert: true }
    );
    console.log("Seeded Workspace");

    // 2. Clear old products & images
    const productsCollection = db.collection("products");
    const imagesCollection = db.collection("product_images");
    await productsCollection.deleteMany({ workspaceId });
    await imagesCollection.deleteMany({});

    const uploadsDir = path.join(__dirname, 'uploads');

    const productsToSeed = [
      {
        id: "prod-lace-001-uuid",
        code: "LACE-001",
        name: "Gold Zari Embroidered Lace Border",
        category: "Lace",
        description: "Premium metallic gold zari thread pattern embroidery on black velvet base. Perfect for bridal sarees and heavy lehengas.",
        price: 15.50,
        unit: "meter",
        stock: 500,
        tags: ["gold", "zari", "lace", "heavy", "bridal"],
        imageFile: "gold_zari_lace.png"
      },
      {
        id: "prod-patta-002-uuid",
        code: "PATTA-002",
        name: "Multicolor Floral Embroidery Patta",
        category: "Patta",
        description: "Traditional roses and leaf vine thread stitch pattern on premium linen fabric border ribbon.",
        price: 24.00,
        unit: "meter",
        stock: 350,
        tags: ["floral", "embroidery", "patta", "linen", "traditional"],
        imageFile: "floral_embroidery_patta.png"
      },
      {
        id: "prod-lace-003-uuid",
        code: "LACE-003",
        name: "Silver Zari Lace Border",
        category: "Lace",
        description: "Premium silver metallic thread zari embroidery pattern on deep navy velvet fabric.",
        price: 18.50,
        unit: "meter",
        stock: 250,
        tags: ["silver", "zari", "lace", "velvet"],
        imageFile: "silver_zari_lace.png"
      },
      {
        id: "prod-patta-004-uuid",
        code: "PATTA-004",
        name: "Red Rose Floral Patta",
        category: "Patta",
        description: "Traditional red rose flower patterns and vine leaves embroidery on premium linen ribbon.",
        price: 21.00,
        unit: "meter",
        stock: 400,
        tags: ["red", "floral", "patta", "linen", "embroidery"],
        imageFile: "red_floral_patta.png"
      },
      {
        id: "prod-lace-005-uuid",
        code: "LACE-005",
        name: "Blue Silk Embroidered Lace",
        category: "Lace",
        description: "Royal blue silk fabric border ribbon decorated with geometric golden thread embroidery.",
        price: 16.90,
        unit: "meter",
        stock: 300,
        tags: ["blue", "silk", "lace", "geometric", "gold"],
        imageFile: "blue_silk_border.png"
      },
      {
        id: "prod-lace-006-uuid",
        code: "LACE-006",
        name: "Pearl Beaded Gold Lace",
        category: "Lace",
        description: "Elegant wedding border lace with intricate real look white pearls and gold thread stitches.",
        price: 28.00,
        unit: "meter",
        stock: 150,
        tags: ["pearl", "beads", "gold", "lace", "bridal"],
        imageFile: "pearl_beaded_lace.png"
      },
      {
        id: "prod-patta-007-uuid",
        code: "PATTA-007",
        name: "Folklore Geometric Cotton Patta",
        category: "Patta",
        description: "Traditional folklore geometric design print and thread stitches on black and white cotton.",
        price: 14.50,
        unit: "meter",
        stock: 600,
        tags: ["folklore", "geometric", "cotton", "patta", "black", "white"],
        imageFile: "geometric_cotton_patta.png"
      },
      {
        id: "prod-lace-008-uuid",
        code: "LACE-008",
        name: "Deep Velvet Zardosi Border",
        category: "Lace",
        description: "Premium luxury hand-crafted zardosi gold wire and copper thread border on deep maroon velvet.",
        price: 32.50,
        unit: "meter",
        stock: 120,
        tags: ["velvet", "zardosi", "gold", "copper", "luxury", "heavy"],
        imageFile: "velvet_zardosi_border.png"
      },
      {
        id: "prod-lace-009-uuid",
        code: "LACE-009",
        name: "Jaipuri Gotta Patti Ribbon",
        category: "Lace",
        description: "Traditional Rajasthani festive gotta patti gold ribbon border on shiny orange silk border.",
        price: 12.00,
        unit: "meter",
        stock: 800,
        tags: ["jaipuri", "gotta-patti", "gold", "ribbon", "orange", "silk"],
        imageFile: "jaipuri_gotta_patti.png"
      },
      {
        id: "prod-lace-010-uuid",
        code: "LACE-010",
        name: "Pink Shisha Mirror Work Lace",
        category: "Lace",
        description: "Colorful ethnic mirror work (shisha embroidery) border with bright thread works on pink cotton.",
        price: 22.50,
        unit: "meter",
        stock: 200,
        tags: ["shisha", "mirror-work", "pink", "ethnic", "embroidery"],
        imageFile: "mirror_work_lace.png"
      },
      {
        id: "prod-lace-011-uuid",
        code: "LACE-011",
        name: "Lucknowi Chikankari Georgette Border",
        category: "Lace",
        description: "Exquisite Lucknowi chikankari shadow work white embroidery on delicate georgette ribbon.",
        price: 26.00,
        unit: "meter",
        stock: 180,
        tags: ["chikankari", "white", "georgette", "border", "lucknowi"],
        imageFile: "chikankari_border.png"
      },
      {
        id: "prod-patta-012-uuid",
        code: "PATTA-012",
        name: "Emerald Banarasi Brocade Patta",
        category: "Patta",
        description: "Stunning Banarasi silk brocade woven pattern with gold motifs on emerald green fabric border.",
        price: 30.00,
        unit: "meter",
        stock: 220,
        tags: ["emerald", "green", "banarasi", "brocade", "silk", "patta"],
        imageFile: "banarasi_brocade.png"
      },
      {
        id: "prod-lace-013-uuid",
        code: "LACE-013",
        name: "Traditional Gold Zari Velvet Border",
        category: "Lace",
        description: "Exquisite handmade traditional gold zari embroidered lace with intricate leaf and vine details on premium black velvet fabric border.",
        price: 19.99,
        unit: "meter",
        stock: 180,
        tags: ["traditional", "gold", "zari", "lace", "velvet", "black"],
        imageFile: "gold_zari_test_image.png"
      },
      {
        id: "prod-lace-014-uuid",
        code: "LACE-014",
        name: "Ruby Red Gold Floral Lace",
        category: "Lace",
        description: "Intricate gold floral thread embroidery pattern on deep red silk fabric border.",
        price: 21.50,
        unit: "meter",
        stock: 140,
        tags: ["ruby", "red", "gold", "floral", "embroidery"],
        imageFile: "gold_floral_lace_new.png"
      },
      {
        id: "prod-patta-015-uuid",
        code: "PATTA-015",
        name: "Royal Navy Zardoosi Patta",
        category: "Patta",
        description: "Intricate handcraft navy blue velvet fabric border with heavy copper zardosi embroidery work.",
        price: 34.00,
        unit: "meter",
        stock: 160,
        tags: ["royal", "navy", "zardoosi", "velvet", "copper"],
        imageFile: "navy_zardoosi_patta_new.png"
      },
      {
        id: "prod-lace-016-uuid",
        code: "LACE-016",
        name: "Emerald Shisha Mirror Work Lace",
        category: "Lace",
        description: "Traditional hand embroidered shisha mirror work on emerald green cotton lace.",
        price: 25.00,
        unit: "meter",
        stock: 190,
        tags: ["emerald", "shisha", "mirror", "green", "cotton"],
        imageFile: "pink_mirror_border_new.png"
      },
      {
        id: "prod-lace-017-uuid",
        code: "LACE-017",
        name: "Vintage White Crochet Lace",
        category: "Lace",
        description: "Exquisite white cotton crochet lace trim border on natural flax linen background.",
        price: 13.99,
        unit: "meter",
        stock: 220,
        tags: ["vintage", "white", "crochet", "lace", "linen"],
        imageFile: "white_lace_trim_new.png"
      },
      {
        id: "prod-lace-018-uuid",
        code: "LACE-018",
        name: "Glimmering Gold Zari Lace Border",
        category: "Lace",
        description: "Premium metallic gold zari border with slightly different patterns on velvet fabric.",
        price: 17.50,
        unit: "meter",
        stock: 200,
        tags: ["gold", "zari", "lace", "velvet"],
        imageFile: "gold_zari_lace_v2.png"
      },
      {
        id: "prod-patta-019-uuid",
        code: "PATTA-019",
        name: "Garden Floral Embroidery Patta",
        category: "Patta",
        description: "Fresh multicolor floral thread vine patterns embroidered on premium linen base.",
        price: 26.50,
        unit: "meter",
        stock: 170,
        tags: ["floral", "embroidery", "patta", "linen"],
        imageFile: "floral_embroidery_patta_v2.png"
      },
      {
        id: "prod-lace-020-uuid",
        code: "LACE-020",
        name: "Starlight Silver Zari Lace",
        category: "Lace",
        description: "Bright silver thread zari pattern woven border on dark velvet ribbon.",
        price: 19.50,
        unit: "meter",
        stock: 150,
        tags: ["silver", "zari", "lace", "velvet"],
        imageFile: "silver_zari_lace_v2.png"
      },
      {
        id: "prod-lace-021-uuid",
        code: "LACE-021",
        name: "Azure Geometric Silk Lace",
        category: "Lace",
        description: "Royal blue silk base fabric border with geometric gold patterns and embroidery.",
        price: 18.90,
        unit: "meter",
        stock: 130,
        tags: ["blue", "silk", "lace", "geometric"],
        imageFile: "blue_silk_border_v2.png"
      },
      {
        id: "prod-lace-022-uuid",
        code: "LACE-022",
        name: "Bridal Pearl Beaded Gold Lace",
        category: "Lace",
        description: "Intricate wedding gold lace with high-density pearl bead decor stitches.",
        price: 29.50,
        unit: "meter",
        stock: 110,
        tags: ["pearl", "beaded", "gold", "lace", "bridal"],
        imageFile: "pearl_beaded_lace_v2.png"
      },
      {
        id: "prod-lace-023-uuid",
        code: "LACE-023",
        name: "Indian Maroon Velvet Zardosi Border",
        category: "Lace",
        description: "Heavy hand-crafted traditional zardosi wire design border on deep maroon velvet fabric.",
        price: 33.50,
        unit: "meter",
        stock: 90,
        tags: ["velvet", "zardosi", "maroon", "gold", "indian"],
        imageFile: "velvet_zardosi_border_v2.png"
      }
    ];

    for (const p of productsToSeed) {
      const imagePath = path.join(uploadsDir, p.imageFile);
      const imageUrl = `http://localhost:4000/api/uploads/${p.imageFile}`;
      console.log(`Generating real CLIP vector for ${p.name}...`);

      // Helper to generate and store an image vector
      async function storeVector(buf, idSuffix, isPrimary = false) {
        let vec = [];
        try {
          vec = await generateEmbedding(buf);
        } catch (err) {
          console.error(`Failed to generate vector for ${p.name} ${idSuffix}, using zeros:`, err.message);
          vec = new Array(512).fill(0);
        }
        const imgId = `img-${p.code.toLowerCase()}-${idSuffix}-uuid`;
        await imagesCollection.insertOne({
          id: imgId,
          productId: p.id,
          image_url: imageUrl,
          qdrant_vector_id: imgId,
          vector: vec,
          is_primary: isPrimary,
          created_at: new Date()
        });
      }

      // Store original image
      await storeVector(imagePath, 'orig', true);

      // Augmentation if enabled
      if (ENABLE_AUGMENTATION) {
        // Rotations
        for (const angle of ROTATION_ANGLES) {
          const rotatedPath = path.join(uploadsDir, `tmp_${p.imageFile.replace(/\.[^/.]+$/, '')}_rot${angle}.png`);
          const imgObj = await Jimp.read(imagePath);
          await imgObj.rotate(angle).write(rotatedPath);
          await storeVector(rotatedPath, `rot${angle}`);
          fs.unlinkSync(rotatedPath);
        }
        // Blur
        for (const sigma of BLUR_SIGMAS) {
          const blurredPath = path.join(uploadsDir, `tmp_${p.imageFile.replace(/\.[^/.]+$/, '')}_blur${sigma}.png`);
          const imgObj = await Jimp.read(imagePath);
          await imgObj.blur(sigma).write(blurredPath);
          await storeVector(blurredPath, `blur${sigma}`);
          fs.unlinkSync(blurredPath);
        }
      }

      // Insert product document once (outside augmentation loop)
      await productsCollection.updateOne({ id: p.id }, { $set: {
        workspaceId,
        product_code: p.code,
        name: p.name,
        category: p.category,
        description: p.description,
        price: p.price,
        unit: p.unit,
        stock: p.stock,
        tags: p.tags,
        status: "ACTIVE",
        created_at: new Date(),
        updated_at: new Date()
      } }, { upsert: true });
    }

    console.log(`Seeded all ${productsToSeed.length} products and computed real CLIP embeddings in MongoDB.`);

  } catch (err) {
    console.error("Error seeding MongoDB:", err);
  } finally {
    await client.close();
  }
}

run();
