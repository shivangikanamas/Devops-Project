package com.example;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class MainTest {
    @Test
    void applicationStartsWithExpectedGreeting() {
        assertEquals("Hello, Maven!", Main.greeting());
    }
}