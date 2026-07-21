export default {
  async fetch(request: Request, env: any) {
    const url = new URL(request.url);

    try {
      const response = await env.ASSETS.fetch(request);
      
      // إذا لم يجد الملف (كما في حالة الروابط الداخلية لـ React)، سيقوم بعرض index.html تلقائياً
      if (response.status === 404) {
        const path = url.pathname;
        const hasExtension = path.includes(".") && !path.endsWith(".html");
        
        if (!hasExtension) {
          const indexRequest = new Request(new URL("/index.html", request.url), request);
          return await env.ASSETS.fetch(indexRequest);
        }
      }
      
      return response;
    } catch (e) {
      // في حالة حدوث خطأ، نقوم بإرجاع طلب الـ Assets كاحتياط
      return new Response("Not Found", { status: 404 });
    }
  },
};
