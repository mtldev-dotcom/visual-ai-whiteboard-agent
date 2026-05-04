import { revalidatePath } from "next/cache";
import Link from "next/link";

import {
  CORE_FILE_NAMES,
  listCoreFiles,
  writeCoreFile,
} from "@/server/core-files";

async function saveCoreFile(formData: FormData) {
  "use server";

  const fileName = String(formData.get("fileName") ?? "");
  const content = String(formData.get("content") ?? "");

  await writeCoreFile(fileName, content);
  revalidatePath("/core");
}

export default async function CoreFilesPage() {
  const files = await listCoreFiles();

  return (
    <main className="min-h-dvh bg-[#f7f5ef] text-[#1f2933]">
      <header className="border-b border-[#d8d2c3] bg-[#fffdfa] px-4 py-4">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6b7280]">
          Assistant core
        </p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold">Core Files</h1>
          <Link
            className="rounded-md border border-[#c7bfae] px-3 py-2 text-sm font-semibold"
            href="/"
          >
            Board
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-5xl gap-4 p-4 lg:grid-cols-[220px_1fr]">
        <aside className="rounded-md border border-[#e7e0d0] bg-white p-3">
          <h2 className="text-sm font-semibold">Files</h2>
          <nav className="mt-3 grid gap-1">
            {CORE_FILE_NAMES.map((fileName) => (
              <a
                className="rounded-md px-2 py-2 text-sm font-medium hover:bg-[#f7f5ef]"
                href={`#${fileName}`}
                key={fileName}
              >
                {fileName}
              </a>
            ))}
          </nav>
        </aside>

        <div className="grid gap-4">
          {files.map((file) => (
            <section
              className="rounded-md border border-[#e7e0d0] bg-white"
              id={file.name}
              key={file.name}
            >
              <div className="border-b border-[#e7e0d0] px-4 py-3">
                <h2 className="text-base font-semibold">{file.name}</h2>
              </div>
              <form action={saveCoreFile} className="grid gap-3 p-4">
                <input name="fileName" type="hidden" value={file.name} />
                <textarea
                  className="min-h-[320px] w-full resize-y rounded-md border border-[#c7bfae] bg-[#fffdfa] p-3 font-mono text-sm leading-6"
                  defaultValue={file.content}
                  name="content"
                  spellCheck={false}
                />
                <div className="flex justify-end">
                  <button className="min-h-11 rounded-md bg-[#2f5d50] px-4 text-sm font-semibold text-white">
                    Save
                  </button>
                </div>
              </form>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
