export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    // هذا الجزء يسمح لـ Cloudflare بمحاولة جلب الملفات الثابتة (مثل الصور والـ JS) من مجلد dist
    // وإذا لم يجد الملف (كما في حالة الروابط الداخلية لـ React)، سيقوم بعرض index.html تلقائياً
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // في حالة حدوث خطأ، نقوم بإرجاع طلب الـ Assets كاحتياط
      return new Response("Not Found", { status: 404 });
    }
  },
};
