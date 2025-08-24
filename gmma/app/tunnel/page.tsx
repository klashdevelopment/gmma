"use client";
import PageLayout from "../components/Layout";
import TunnelPage from "./TunnelPage";

export default function TunnelRoute() {
    return (
        <PageLayout hideLeft={true}>
            <TunnelPage />
        </PageLayout>
    )
}