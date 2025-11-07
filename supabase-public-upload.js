import "jsr:@supabase/functions-js/edge-runtime.d.ts";
console.log("✅ Upload Document Function Booted");
// ---------- SERVER ENTRY ----------
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: corsHeaders()
  });
  try {
    const { createClient } = await import("jsr:@supabase/supabase-js@2");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // ---- NO AUTH - PUBLIC ACCESS ----
    // Removed authentication check - function is now public
    
    // ---- PARSE FILE ----
    const formData = await req.formData();
    const file = formData.get("file");
    const docType = formData.get("type") || "prescription";
    const patientId = formData.get("patient_id") || "public-patient"; // Use public patient ID
    if (!file) return jsonError("No file provided", 400);
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/jpg"
    ];
    if (!allowedTypes.includes(file.type)) {
      return jsonError("Invalid file type. Only PDF and images allowed.", 400);
    }
    // ---- UPLOAD TO STORAGE ----
    const bucket = "documents";
    const fileName = `${patientId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, {
      contentType: file.type,
      upsert: false
    });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
    const fileUrl = urlData.publicUrl;
    console.log("📄 Uploaded:", fileUrl);
    // ---- OCR (PDF or IMAGE) ----
    const arrayBuffer = await file.arrayBuffer();
    let extractedText = "";
    let ocrError = null;
    try {
      extractedText = await extractTextFromFile(file.type, arrayBuffer, docType, geminiApiKey);
      console.log(`📝 Extracted ${extractedText.length} characters`);
    } catch (err) {
      console.error("❌ OCR Error:", err);
      ocrError = err.message;
    // Continue processing even if OCR fails
    }
    let structuredData = {};
    let confidence = extractedText.length > 100 ? 0.9 : 0.7;
    // ---- STRUCTURED DATA (for prescriptions) ----
    if (docType === "prescription" && geminiApiKey && extractedText) {
      try {
        structuredData = await extractStructuredInfo(extractedText, geminiApiKey);
        console.log("📊 Structured data:", JSON.stringify(structuredData).substring(0, 200));
      } catch (err) {
        console.error("❌ Structured extraction error:", err);
      }
    }
    // ---- INSERT INTO DOCUMENTS ----
    const { data: doc, error: docError } = await supabase.from("documents").insert({
      patient_id: patientId,
      type: docType,
      file_url: fileUrl,
      text: extractedText,
      structured_json: structuredData,
      ocr_confidence: confidence
    }).select().single();
    if (docError) throw docError;
    console.log("🧾 Document record:", doc.id);
    // ---- EMBEDDINGS ----
    if (extractedText && geminiApiKey) {
      try {
        await generateEmbeddings(supabase, patientId, doc.id, extractedText, docType, geminiApiKey);
        console.log("🔍 Embeddings generated successfully");
      } catch (err) {
        console.error("❌ Embeddings error:", err);
      // Continue even if embeddings fail
      }
    }
    // ---- AUTO-INSERT MEDICATIONS ----
    if (docType === "prescription" && confidence > 0.85 && structuredData.medications?.length > 0) {
      for (const med of structuredData.medications){
        try {
          await supabase.from("medications").insert({
            patient_id: patientId,
            document_id: doc.id,
            name: med.name,
            strength: med.strength,
            form: med.form,
            frequency: med.frequency,
            route: med.route,
            duration_days: med.duration_days || null,
            start_date: new Date().toISOString().split("T")[0],
            reminders_enabled: false
          });
          console.log(`💊 Added medication: ${med.name}`);
        } catch (err) {
          console.error(`❌ Medication insert error for ${med.name}:`, err);
        }
      }
    }
    // ---- SUCCESS RESPONSE ----
    return new Response(JSON.stringify({
      success: true,
      document_id: doc.id,
      file_url: fileUrl,
      extracted_text: extractedText,
      structured_data: structuredData,
      confidence,
      needs_verification: confidence < 0.85,
      ocr_error: ocrError
    }), {
      status: 200,
      headers: corsJsonHeaders()
    });
  } catch (err) {
    console.error("❌ Function Error:", err);
    return jsonError(err.message || "Internal server error", 500);
  }
});
// ---------- HELPERS ----------
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
  };
}
function corsJsonHeaders() {
  return {
    "Content-Type": "application/json",
    ...corsHeaders()
  };
}
function jsonError(message, status = 400) {
  return new Response(JSON.stringify({
    error: message
  }), {
    status,
    headers: corsJsonHeaders()
  });
}
// ---------- OCR EXTRACT ----------
async function extractTextFromFile(mime, arrayBuffer, docType, geminiApiKey) {
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = "";
  for(let i = 0; i < uint8Array.length; i++){
    binary += String.fromCharCode(uint8Array[i]);
  }
  const base64Data = btoa(binary);
  const prompt = docType === "prescription" ? `You are a medical document OCR expert. Extract ALL text from this prescription document with extreme accuracy.

EXTRACT EVERYTHING INCLUDING:
1. Patient Information (name, age, date)
2. Doctor Information (name, registration, signature)
3. Complete Medication Details:
   - Exact medicine names (brand and generic)
   - Precise strengths and dosages
   - Form (tablet/capsule/syrup/injection)
   - Frequency (how many times per day)
   - Duration (number of days)
   - Route (oral/topical/IV etc)
4. Special Instructions
5. Diagnosis or complaints
6. Any other visible text

Format the output clearly with proper sections. Be thorough and accurate.` : "Extract all visible text from this document accurately, maintaining structure and formatting.";
  // MODEL CHANGE: Changed gemini-2.0-flash-exp to the currently supported gemini-2.5-flash
  const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
  console.log(`🔍 Processing ${mime === "application/pdf" ? "PDF" : "image"} with Gemini 2.5 Flash`);
  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt
          },
          {
            inline_data: {
              mime_type: mime,
              data: base64Data
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192,
      topK: 40,
      topP: 0.95
    }
  };
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error("Gemini API Error Response:", errorText);
    throw new Error(`Gemini API failed: ${res.status} - ${errorText}`);
  }
  const json = await res.json();
  const extractedText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  if (!extractedText) {
    console.warn("⚠️ Gemini returned empty response");
    console.log("Full API Response:", JSON.stringify(json));
  }
  return extractedText.trim();
}
// ---------- STRUCTURED INFO ----------
async function extractStructuredInfo(extractedText, geminiApiKey) {
  try {
    const prompt = `You are a medical prescription parser. Analyze this prescription text and extract structured medication data.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.

Required JSON structure:
{
  "medications": [
    {
      "name": "full medication name",
      "strength": "dosage with unit (e.g., 500mg, 5ml)",
      "form": "tablet/capsule/syrup/injection/cream",
      "frequency": "e.g., twice daily, 3 times a day, once daily",
      "route": "oral/topical/IV/IM/subcutaneous",
      "duration_days": 7
    }
  ]
}

Rules:
- Extract only medications explicitly mentioned
- Use exact names from the prescription
- If duration is not specified, use null
- If any field is unclear, use "not specified"

Prescription text:
${extractedText}

JSON:`;
    // MODEL CHANGE: Changed gemini-2.0-flash-exp to the currently supported gemini-2.5-flash
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048
        }
      })
    });
    if (!res.ok) {
      const errorText = await res.text();
      console.error("Structured extraction API error:", errorText);
      return {
        medications: []
      };
    }
    const json = await res.json();
    let text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    text = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").replace(/^[\s\n]+|[\s\n]+$/g, "").trim();
    console.log("Raw structured response:", text.substring(0, 200));
    const parsed = JSON.parse(text);
    if (!parsed.medications || !Array.isArray(parsed.medications)) {
      return {
        medications: []
      };
    }
    parsed.medications = parsed.medications.map((med)=>({
        name: med.name || "Unknown",
        strength: med.strength || "not specified",
        form: med.form || "not specified",
        frequency: med.frequency || "not specified",
        route: med.route || "oral",
        duration_days: med.duration_days || null
      }));
    return parsed;
  } catch (err) {
    console.error("Structured extraction parsing error:", err);
    return {
      medications: []
    };
  }
}
// ---------- EMBEDDINGS ----------
async function generateEmbeddings(supabase, patientId, docId, text, docType, apiKey) {
  const chunks = chunkText(text, 1500);
  console.log(`🔢 Generating embeddings for ${chunks.length} chunks`);
  for(let i = 0; i < chunks.length; i++){
    const chunk = chunks[i];
    if (!chunk.trim()) continue;
    try {
      // MODEL CHANGE: Replaced text-embedding-004 with the latest and recommended text-embedding-004 or similar, keeping the original endpoint as it's typically correct for the model name.
      const res = await fetch(`https://generativelanguage.googleapis.com/v1/models/text-embedding-004:embedContent?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: {
            parts: [
              {
                text: chunk
              }
            ]
          },
          taskType: "RETRIEVAL_DOCUMENT"
        })
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Embedding API error for chunk ${i}:`, errorText);
        continue;
      }
      const data = await res.json();
      const embedding = data.embedding?.values;
      if (embedding && Array.isArray(embedding) && embedding.length > 0) {
        const { error } = await supabase.from("rag_chunks").insert({
          patient_id: patientId,
          document_id: docId,
          chunk_text: chunk,
          embedding,
          metadata: {
            doc_type: docType,
            chunk_index: i,
            chunk_length: chunk.length,
            total_chunks: chunks.length,
            timestamp: new Date().toISOString()
          }
        });
        if (error) {
          console.error(`Error inserting chunk ${i}:`, error.message);
        } else {
          console.log(`✅ Embedded chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
        }
      } else {
        console.warn(`⚠️ Invalid embedding received for chunk ${i}`);
      }
      if (i < chunks.length - 1) {
        await new Promise((resolve)=>setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error(`Embedding error for chunk ${i}:`, err.message);
    }
  }
  console.log(`✅ Embedding generation complete for document ${docId}`);
}
// ---------- UTIL ----------
function chunkText(text, maxChars) {
  if (!text || text.length === 0) return [];
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let current = "";
  for (const para of paragraphs){
    const trimmed = para.trim();
    if (!trimmed) continue;
    if (trimmed.length > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      const sentences = trimmed.match(/[^.!?]+[.!?]+/g) || [
        trimmed
      ];
      for (const sent of sentences){
        if ((current + sent).length > maxChars && current) {
          chunks.push(current.trim());
          current = sent;
        } else {
          current += (current ? " " : "") + sent;
        }
      }
    } else {
      if (current && (current + "\n\n" + trimmed).length > maxChars) {
        chunks.push(current.trim());
        current = trimmed;
      } else {
        current += (current ? "\n\n" : "") + trimmed;
      }
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }
  if (chunks.length === 0 && text.trim()) {
    chunks.push(text.trim());
  }
  return chunks;
}