export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="flex flex-1 items-center justify-center p-8">
      <p className="text-muted-foreground">
        Editing for resource {id} is coming soon.
      </p>
    </main>
  );
}
