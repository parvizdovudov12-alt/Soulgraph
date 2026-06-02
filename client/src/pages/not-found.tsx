import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

export default function NotFound() {
  const { language } = useLanguage();
  const title = language === "ru" ? "404 Страница не найдена" : "404 Page Not Found";
  const description = language === "ru" ? "Похоже, эта страница не подключена к маршрутам приложения." : "Looks like this page is not connected to the app router.";

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>
          <p className="mt-4 text-sm text-gray-600">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
