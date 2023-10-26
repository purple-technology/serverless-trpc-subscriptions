"use client";
import { Button } from "./Button/Button";
import * as React from "react";
import { AddIssueModal } from "./AddIssueModal/AddIssueModal";
import { Lanes } from "./Lanes/Lanes";
import { api } from "./api";

export default function Home() {
  const [addingIssues, setAddingIssues] = React.useState(false);

  return (
    <main>
      <header className="px-5 py-3">
        <h1 className="text-2xl">Manage Issues</h1>
      </header>
      <nav className="px-5 py-2">
        <Button onClick={() => setAddingIssues(true)}>Add Issues</Button>
      </nav>
      <Lanes />
      <AddIssueModal
        key={+addingIssues}
        show={addingIssues}
        onCancel={() => setAddingIssues(false)}
      />
    </main>
  );
}
