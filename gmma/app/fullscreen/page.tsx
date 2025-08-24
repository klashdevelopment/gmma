"use client";
import PageLayout from "../components/Layout";
import FullscreenPage from "./fs-page";

export default function FullscreenRoute() {

    return (
        <PageLayout hideLeft={true}>
            <FullscreenPage />
        </PageLayout>
    )
}