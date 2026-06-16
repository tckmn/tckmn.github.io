/*
 * PCG32 generator ported to C#.
 *
 * Based on original PCG32 code at https://www.pcg-random.org
 * which is (c) 2014 Melissa O'Neill <oneill@pcg-random.org>
 * under Apache License 2.0 (NO WARRANTY, etc. see website).
 */

using System;

namespace PCG32 {

    public class Random {
        private ulong state;

        public Random(ulong Seed) {
            state = 0;
            NextUnsigned();
            state += Seed;
            NextUnsigned();
        }

        // constructors for compatability with System.Random
        public Random(int seed) : this((ulong) seed) {}
        public Random() : this(Environment.TickCount) {}

        public uint NextUnsigned() {
            ulong oldstate = state;
            state = oldstate * 6364136223846793005UL + 1;
            uint xs = (uint)(((oldstate >> 18) ^ oldstate) >> 27);
            uint rot = (uint)(oldstate >> 59);
            return (xs >> (int)rot) | (xs << (int)((~rot + 1) & 31));
        }

        public uint NextUnsigned(uint maxValue) {
            uint threshold = (~maxValue + 1) % maxValue;
            for (;;) {
                uint r = NextUnsigned();
                if (r >= threshold) return r % maxValue;
            }
        }

        public uint NextUnsigned(uint minValue, uint maxValue) {
            if (minValue > maxValue) {
                throw new ArgumentOutOfRangeException("minValue", "minValue must be at most maxValue");
            }

            return minValue + NextUnsigned(maxValue - minValue);
        }

        public int Next() {
            // for compatability with System.Random, never return MaxValue
            return Next(Int32.MaxValue);
        }

        public int Next(int maxValue) {
            if (maxValue < 0) {
                throw new ArgumentOutOfRangeException("maxValue", "maxValue must be nonnegative");
            }

            return (int)NextUnsigned((uint)maxValue);
        }

        public int Next(int minValue, int maxValue) {
            if (minValue > maxValue) {
                throw new ArgumentOutOfRangeException("minValue", "minValue must be at most maxValue");
            }

            return (int)(minValue + NextUnsigned((uint)(maxValue - minValue)));
        }

        public double NextDouble() {
            // this has some flaws: https://mumble.net/~campbell/tmp/random_real.c
            // but for our purposes, it's "good enough"
            return NextUnsigned(UInt32.MaxValue)*(1.0/UInt32.MaxValue);
        }
    }

}
