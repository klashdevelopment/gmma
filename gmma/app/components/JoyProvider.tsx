"use client";
import { CssVarsProvider } from "@mui/joy/styles";
import { ReactNode } from "react";
import { extendTheme } from "@mui/joy/styles";

const theme = extendTheme({
    colorSchemes: {
        dark: {
            palette: {
                primary: {
                    50: '#e8f9f0',
                    100: '#d1f4e1',
                    200: '#a3e9c3',
                    300: '#75dea5',
                    400: '#47d387',
                    500: '#12c060',
                    600: '#0e9a4d',
                    700: '#0b733a',
                    800: '#074d26',
                    900: '#042613',
                },
                danger: {
                    50: '#fdf2f2',
                    100: '#fde8e8',
                    200: '#fbd5d5',
                    300: '#f8b4b4',
                    400: '#f98080',
                    500: '#f05252',
                    600: '#e02424',
                    700: '#c81e1e',
                    800: '#9b1c1c',
                    900: '#771d1d'
                },
                warning: {
                    50: '#e6f9fa',
                    100: '#c2f1f3',
                    200: '#8be3e7',
                    300: '#54d5db',
                    400: '#2bc9d1',
                    500: '#14b0b8',
                    600: '#109099',
                    700: '#0d7079',
                    800: '#095059',
                    900: '#06303a'
                }

            },
        },
    },
});

export default function JoyProvider({ children }: { children: ReactNode }) {
    return (
        <CssVarsProvider defaultMode="dark" theme={theme}>
            {children}
        </CssVarsProvider>
    );
}