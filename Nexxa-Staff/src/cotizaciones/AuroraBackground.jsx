import React, { useEffect, useState, useRef } from 'react';

export function AuroraBackground() {
    const blob1Ref = useRef(null);
    const blob2Ref = useRef(null);
    const blob3Ref = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (requestRef.current) return;

            requestRef.current = requestAnimationFrame(() => {
                const x = (e.clientX / window.innerWidth) * 2 - 1;
                const y = (e.clientY / window.innerHeight) * 2 - 1;

                if (blob1Ref.current) {
                    blob1Ref.current.style.transform = `translate(${x * -30}px, ${y * -30}px)`;
                }
                if (blob2Ref.current) {
                    blob2Ref.current.style.transform = `translate(${x * 20}px, ${y * 20}px)`;
                }
                if (blob3Ref.current) {
                    blob3Ref.current.style.transform = `translate(${x * -50}px, ${y * -50}px)`;
                }

                requestRef.current = null;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    return (
        <div className="aurora-bg">
            <div ref={blob1Ref} className="aurora-blob blob-1"></div>
            <div ref={blob2Ref} className="aurora-blob blob-2"></div>
            <div ref={blob3Ref} className="aurora-blob blob-3"></div>
        </div>
    );
}
